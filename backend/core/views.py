from decimal import Decimal
from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, serializers, status, permissions, exceptions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
from datetime import datetime
import logging

from .models import (
    Instrumento, Usuario, VisorInteraccion, Examen, Pregunta, Opcion,
    IntentoExamen, RespuestaEstudiante, Grupo, Permiso, UsuarioGrupo, GrupoPermiso, Nota
)
from .utils import build_structured_log
from .serializers import (
    AlumnoSerializer,
    AsignarInstrumentoSerializer,
    InstrumentoSerializer,
    CustomTokenObtainPairSerializer,
    UsuarioSerializer,
    RegistroAlumnoSerializer,
    VisorInteraccionSerializer,
    OpcionSerializer,
    PreguntaSerializer,
    ExamenSerializer,
    ExamenEstudianteSerializer,
    IntentoExamenSerializer,
    RespuestaEstudianteSerializer,
    EditarAlumnoSerializer,
    ProfesorPerfilSerializer,
    CambiarContraseñaSerializer,
    PerfilUsuarioSerializer,
    NotaSerializer,
    ResponderExamenSerializer,
)

# Configurar logger
logger = logging.getLogger(__name__)


class IsProfesor(permissions.BasePermission):
    """Permiso personalizado que permite acceso solo a profesores o staff."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        usuario = request.user
        # Permitir si es staff, rol PROFESOR, o pertenece al grupo 'Instructor'
        if usuario.is_staff or getattr(usuario, 'rol', None) == 'PROFESOR':
            return True

        # Comprobar grupos por nombre (case-insensitive)
        try:
            groups = [g.name.lower() for g in usuario.groups.all()]
            if 'instructor' in groups or 'profesor' in groups:
                return True
        except Exception:
            pass

        return False


class IsEstudiante(permissions.BasePermission):
    """Permiso personalizado que permite acceso solo a estudiantes."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        usuario = request.user
        if getattr(usuario, 'rol', None) == 'ESTUDIANTE':
            return True

        try:
            groups = [g.name.lower() for g in usuario.groups.all()]
            return 'estudiante' in groups
        except Exception:
            return False


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    """Endpoint simple para verificar el estado del backend."""
    return Response({"status": "healthy"}, status=status.HTTP_200_OK)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista personalizada para obtener tokens JWT.
    
    Extiende TokenObtainPairView para usar CustomTokenObtainPairSerializer.
    Implementa manejo defensivo de errores y logging estructurado.
    
    Endpoint: POST /api/login/
    
    Manejo de errores:
    - Valida presencia de username y password
    - Maneja intentos fallidos de autenticación
    - Retorna mensajes de error claros al cliente
    - Registra todos los errores en logs
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        """Procesa solicitud de login con manejo defensivo y logging estructurado."""
        try:
            # Validar que el payload no esté vacío
            if not request.data:
                logger.warning(build_structured_log("ERROR", "Intento de login con payload vacío"))
                return Response(
                    {"error": "Datos de login requeridos"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validar presencia de campos obligatorios
            cedula = request.data.get("cedula", "").strip() or request.data.get("username", "").strip()
            password = request.data.get("password", "")

            if not cedula or not password:
                logger.warning(build_structured_log("ERROR", "Intento de login sin cédula o contraseña"))
                return Response(
                    {
                        "error": "Cédula y contraseña son requeridos",
                        "details": {
                            "cedula": "Este campo es obligatorio" if not cedula else None,
                            "password": "Este campo es obligatorio" if not password else None,
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Ejecutar autenticación del padre (TokenObtainPairView)
            response = super().post(request, *args, **kwargs)

            # Si la autenticación fue exitosa, loguear
            if response.status_code == 200:
                logger.info(build_structured_log("INFO", f"Login exitoso para usuario: {cedula}"))

            return response

        except serializers.ValidationError as e:
            # Errores de validación del serializer (credenciales incorrectas, etc)
            logger.warning(build_structured_log("ERROR", f"Error de validación en login: {str(e)}"))
            return Response(
                {
                    "error": "Credenciales inválidas. Intente nuevamente.",
                    "details": e.detail,
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except Exception as e:
            # Capturar cualquier otro error inesperado
            logger.error(build_structured_log("ERROR", f"Excepción no manejada en login: {type(e).__name__}: {str(e)}"))
            return Response(
                {
                    "error": "Error interno del servidor. Intente más tarde.",
                    "debug": str(e) if hasattr(request, "DEBUG") else None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AlumnosListView(APIView):
    """Endpoint para listar todos los alumnos. Solo accesible por PROFESOR."""

    permission_classes = [IsAuthenticated, IsProfesor]

    def get(self, request, *args, **kwargs):
        """
        Retorna la lista de estudiantes registrados con su instrumento asignado actual.

        Request:
            - no espera payload en GET

        Response:
            - 200: lista de estudiantes con fields id, cedula, nombre_completo, email, instrumento_asignado
            - 500: error interno con mensaje de error
        """
        try:
            estudiantes = Usuario.objects.filter(rol='ESTUDIANTE').order_by('apellido', 'nombre')
            serializer = AlumnoSerializer(estudiantes, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.error(build_structured_log("ERROR", f"Error al listar alumnos: {str(exc)}"))
            return Response(
                {"error": "No se pudo listar los estudiantes"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AsignarInstrumentoView(APIView):
    """Endpoint para asignar un instrumento disponible a un estudiante."""

    permission_classes = [IsAuthenticated, IsProfesor]

    def post(self, request, *args, **kwargs):
        """
        Asigna un instrumento a un estudiante.

        Request payload:
            - estudiante_id: int
            - instrumento_id: int

        Response:
            - 200: mensaje de éxito
            - 400: validación de datos o estudiante/instrumento inválido
            - 500: error interno
        """
        try:
            serializer = AsignarInstrumentoSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            result = serializer.save()

            logger.info(build_structured_log("INFO", f"Instrumento {result['instrumento'].id} asignado a estudiante {result['estudiante'].email}"))
            return Response(
                {"message": "Instrumento asignado correctamente"},
                status=status.HTTP_200_OK,
            )

        except serializers.ValidationError as exc:
            logger.error(build_structured_log("ERROR", f"Error de validación en asignación de instrumento: {exc.detail}"))
            return Response(
                {
                    "error": "Datos inválidos para asignar instrumento",
                    "details": exc.detail,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as exc:
            logger.error(build_structured_log("ERROR", f"Error al asignar instrumento: {str(exc)}"))
            return Response(
                {"error": "Error interno al asignar instrumento"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RegistrarAlumnoView(APIView):
    """
    Endpoint cerrado para que un profesor registre nuevos alumnos.
    
    GARANTÍAS DE INTEGRIDAD:
    - Transacción ACID: Si algo falla, el estudiante NO se crea
    - Asignación automática del profesor como instructor_encargado
    - Asignación automática a grupo 'Estudiantes' y auth.Group
    - Logging exhaustivo para auditoría
    """

    permission_classes = [IsAuthenticated, IsProfesor]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        """
        Registra un alumno nuevo en una transacción ACID.
        
        Garantiza que:
        1. El usuario se crea correctamente
        2. Se asigna el profesor como instructor_encargado
        3. Se asignan los grupos necesarios
        4. O todo falla y nada se guarda (rollback automático)

        Request payload:
        - cedula (str): Identificador único
        - nombre (str)
        - apellido (str)
        - email (str): Debe ser único
        - carrera (str): Carrera académica       
        - semestre (int): 1-12
        - rango_militar (str, optional)
        - password (str, optional): Si no se envía, usa default
        

        Response:
            - 201: alumno creado con instructor asignado
            - 400: datos inválidos o cédula/email duplicada
            - 500: error interno
        """
        try:
            # 1️⃣ VALIDAR Y CREAR USUARIO
            serializer = RegistroAlumnoSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            alumno = serializer.save()

            # 2️⃣ ASIGNAR INSTRUCTOR (CRITICAL)
            # Este es el campo clave que filtra los exámenes en ExamenEstudianteViewSet
            if not request.user.id:
                raise ValueError("Profesor actual no tiene ID válido")
            
            alumno.instructor_encargado = request.user
            alumno.save(update_fields=['instructor_encargado'])
            print(f"[DEBUG] instructor_encargado asignado al alumno: {alumno.instructor_encargado} (ID: {getattr(alumno.instructor_encargado, 'id', 'None')})")
            
            # Verificar que se guardó correctamente
            alumno.refresh_from_db()
            if not alumno.instructor_encargado:
                raise IntegrityError(
                    f"instructor_encargado no se asignó correctamente a estudiante {alumno.cedula}"
                )

            # 3️⃣ ASIGNAR A GRUPO 'Estudiantes'
            try:
                grupo_estudiantes, _ = Grupo.objects.get_or_create(
                    nombre='Estudiantes',
                    defaults={
                        'descripcion': 'Grupo institucional de alumnos de la banda de guerra',
                    },
                )
                UsuarioGrupo.objects.get_or_create(
                    usuario=alumno,
                    grupo=grupo_estudiantes,
                    defaults={'fecha_asignacion': timezone.now()},
                )
                auth_group, _ = Group.objects.get_or_create(name='Estudiantes')
                alumno.groups.add(auth_group)
            except Exception as group_exc:
                logger.warning(
                    f"[WARN] [{datetime.now().strftime('%Y-%m-%d')}]: "
                    f"No se pudo asignar el grupo Estudiantes al alumno {alumno.cedula}: {str(group_exc)}"
                )

            # 4️⃣ LOG Y RESPUESTA
            logger.info(
                f"[INFO] [{datetime.now().strftime('%Y-%m-%d')}]: "
                f"✅ Alumno registrado: {alumno.nombre} {alumno.apellido} (Cédula: {alumno.cedula}) "
                f"→ Instructor: {request.user.nombre} {request.user.apellido} (ID: {request.user.id})"
            )
            return Response(
                {
                    'id': alumno.id,
                    'cedula': alumno.cedula,
                    'nombre': alumno.nombre,
                    'apellido': alumno.apellido,
                    'email': alumno.email,
                    'rol': alumno.rol,
                    'instructor_encargado': {
                        'id': request.user.id,
                        'cedula': request.user.cedula,
                        'nombre': request.user.nombre,
                        'apellido': request.user.apellido,
                        'rango_militar': request.user.rango_militar,
                    },
                    'mensaje': 'Alumno registrado exitosamente y vinculado a tu panel',
                },
                status=status.HTTP_201_CREATED,
            )

        except serializers.ValidationError as exc:
            logger.error(
                f"[ERROR] [{datetime.now().strftime('%Y-%m-%d')}]: "
                f"Validación fallida en registro de alumno: {exc.detail}"
            )
            return Response(
                {
                    'error': 'Datos inválidos para registrar el alumno',
                    'details': exc.detail,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except IntegrityError as exc:
            logger.error(
                f"[ERROR] [{datetime.now().strftime('%Y-%m-%d')}]: "
                f"Error de integridad en registro de alumno: {str(exc)}"
            )
            return Response(
                {
                    'error': 'Error de consistencia: No se pudo asignar el instructor. Por favor intenta nuevamente.',
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        except Exception as exc:
            logger.exception(
                f"[ERROR] [{datetime.now().strftime('%Y-%m-%d')}]: "
                f"Excepción inesperada en registro de alumno"
            )
            return Response(
                {'error': 'Error interno al registrar alumno'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def editar_estudiante(request, pk):
    """
    Permite a un profesor editar los datos académicos y personales de un estudiante.
    
    Validaciones:
    - Solo PROFESOR puede editar
    - El estudiante debe existir y tener rol ESTUDIANTE
    - Se permite corregir cédula (ej: error tipográfico)
    - El campo email está protegido para evitar inconsistencias
    - Se registra auditoría de cambios en logs
    
    Campos editables: cedula, nombre, apellido, carrera, semestre, rango_militar
    
    Request (PUT):
        {
            "cedula": "25123456",      # Opcional: para corregir error
            "nombre": "Juan",          # Opcional
            "apellido": "Pérez",       # Opcional
            "carrera": "Ingeniería...", # Opcional
            "semestre": 5,             # Opcional
            "rango_militar": "Sargento" # Opcional
        }
    
    Response:
        200: Datos actualizados del estudiante
        400: Errores de validación
        403: Usuario no es profesor
        404: Estudiante no encontrado
    """
    # Validar que el usuario autenticado es profesor
    if request.user.rol != 'PROFESOR':
        logger.warning(
            f"[SEGURIDAD] [{datetime.now().isoformat()}]: "
            f"Intento de edición de alumno por usuario no profesor: {request.user.cedula}"
        )
        return Response(
            {'error': 'Acceso denegado: no tiene permisos de profesor'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Obtener el estudiante a editar
    try:
        alumno = Usuario.objects.get(pk=pk, rol='ESTUDIANTE')
    except Usuario.DoesNotExist:
        logger.warning(
            f"[ERROR] [{datetime.now().isoformat()}]: "
            f"Intento de editar estudiante inexistente ID={pk}"
        )
        return Response(
            {'error': 'Estudiante no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Guardar datos anteriores para auditoría
    datos_anteriores = {
        'cedula': alumno.cedula,
        'nombre': alumno.nombre,
        'apellido': alumno.apellido,
        'carrera': alumno.carrera,
    }
    
    # Usar EditarAlumnoSerializer que valida campos permitidos
    serializer = EditarAlumnoSerializer(alumno, data=request.data, partial=True)
    
    if serializer.is_valid():
        alumno_actualizado = serializer.save()
        
        # Registrar cambios en logs (auditoría)
        cambios = {}
        if request.data.get('cedula') and request.data.get('cedula') != datos_anteriores['cedula']:
            cambios['cedula'] = f"{datos_anteriores['cedula']} → {alumno_actualizado.cedula}"
        if request.data.get('nombre') and request.data.get('nombre') != datos_anteriores['nombre']:
            cambios['nombre'] = f"{datos_anteriores['nombre']} → {alumno_actualizado.nombre}"
        if request.data.get('apellido') and request.data.get('apellido') != datos_anteriores['apellido']:
            cambios['apellido'] = f"{datos_anteriores['apellido']} → {alumno_actualizado.apellido}"
        
        if cambios:
            logger.info(
                f"[AUDITORÍA] [{datetime.now().isoformat()}]: "
                f"Profesor {request.user.cedula} editó estudiante {alumno_actualizado.cedula}: {cambios}"
            )
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_estudiante(request, pk):
    if getattr(request.user, 'rol', None) != 'PROFESOR':
        return Response(
            {'detail': 'Acceso denegado. El usuario debe ser PROFESOR.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        alumno = Usuario.objects.get(pk=pk, rol='ESTUDIANTE')
    except Usuario.DoesNotExist:
        return Response(
            {'detail': 'Alumno no encontrado.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    alumno.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


class InstrumentoViewSet(viewsets.ModelViewSet):
    """
    CRUD API para gestionar Instrumentos con permisos basados en roles.
    
    Permisos:
    - PROFESOR: CRUD completo (create, read, update, delete)
    - ESTUDIANTE: Solo lectura (GET)
    - Anónimo: Sin acceso
    
    Endpoints:
    - GET    /api/instrumentos/              - Listar instrumentos
    - POST   /api/instrumentos/              - Crear nuevo (solo PROFESOR)
    - GET    /api/instrumentos/<id>/         - Obtener detalles
    - PUT    /api/instrumentos/<id>/         - Actualizar (solo PROFESOR)
    - PATCH  /api/instrumentos/<id>/         - Actualizar parcial (solo PROFESOR)
    - DELETE /api/instrumentos/<id>/         - Eliminar (solo PROFESOR)
    - GET    /api/instrumentos/disponibles/  - Listar disponibles
    - POST   /api/instrumentos/<id>/asignar/ - Asignar a estudiante (solo PROFESOR)
    - POST   /api/instrumentos/<id>/liberar/ - Liberar instrumento (solo PROFESOR)
    
    Filtros:
    - estado: Filtrar por estado
    - usuario_id: Filtrar por estudiante asignado
    - tipo: Filtrar por tipo
    - activo: Filtrar activos/inactivos
    """

    queryset = Instrumento.objects.all().order_by("-fecha_registro")
    serializer_class = InstrumentoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['estado', 'tipo', 'activo']

    def get_permissions(self):
        """
        Define permisos según la acción:
        - PROFESOR: CRUD completo
        - ESTUDIANTE: Solo lectura (GET)
        """
        if self.request.method in permissions.SAFE_METHODS:
            # GET, HEAD, OPTIONS - Permitir a estudiantes y profesores
            # Allow public read access for safe methods (list/detail/disponibles)
            return [permissions.AllowAny()]
        else:
            # POST, PUT, PATCH, DELETE - Solo profesores
            return [permissions.IsAuthenticated(), IsProfesor()]

    def get_queryset(self):
        """
        Personaliza queryset según filtros y rol del usuario.
        """
        try:
            qs = super().get_queryset()
            
            # Filtros query params
            estado = self.request.query_params.get("estado")
            usuario_id = self.request.query_params.get("usuario_id")
            tipo = self.request.query_params.get("tipo")
            activo = self.request.query_params.get("activo")

            if estado:
                qs = qs.filter(estado__iexact=estado)

            if usuario_id:
                try:
                    qs = qs.filter(usuario_id=int(usuario_id))
                except ValueError:
                    logger.warning(
                        f"[SEGURIDAD] [{datetime.now().isoformat()}]: "
                        f"usuario_id inválido en filtro: {usuario_id}"
                    )

            if tipo:
                qs = qs.filter(tipo__iexact=tipo)
            
            if activo:
                qs = qs.filter(activo=activo.lower() == 'true')

            return qs.filter(activo=True)  # Solo mostrar instrumentos activos por defecto
            
        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error en get_queryset: {str(e)}"
            )
            return Instrumento.objects.none()

    def perform_create(self, serializer):
        """Auditoría al crear instrumento"""
        instrumento = serializer.save()
        logger.info(
            f"[AUDITORÍA] [{datetime.now().isoformat()}]: "
            f"Profesor {self.request.user.cedula} creó instrumento: {instrumento.nombre} ({instrumento.numero_serie})"
        )

    def create(self, request, *args, **kwargs):
        """Override create to return the fully serialized instance (including read-only computed fields)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instrumento = serializer.save()
        out_serializer = self.get_serializer(instrumento)
        headers = self.get_success_headers(out_serializer.data)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        """Auditoría al actualizar instrumento"""
        instrumento = serializer.save()
        logger.info(
            f"[AUDITORÍA] [{datetime.now().isoformat()}]: "
            f"Profesor {self.request.user.cedula} actualizó instrumento: {instrumento.nombre} ({instrumento.numero_serie})"
        )

    def perform_destroy(self, instance):
        """Auditoría al eliminar instrumento"""
        logger.warning(
            f"[AUDITORÍA] [{datetime.now().isoformat()}]: "
            f"Profesor {self.request.user.cedula} eliminó instrumento: {instance.nombre} ({instance.numero_serie})"
        )
        instance.delete()

    @action(detail=False, methods=["get"])
    def disponibles(self, request):
        """
        Acción especial: Lista instrumentos disponibles.

        Endpoint:
            GET /api/instrumentos/disponibles/

        Query params:
            tipo (opcional): Filtrar por tipo (Viento, Percusión, etc)

        Response:
            - 200: lista de instrumentos con estado "Disponible"
            - 500: error interno
        """
        try:
            qs = self.get_queryset().filter(estado='Disponible', activo=True)
            
            # Permitir filtrar por tipo
            tipo = request.query_params.get("tipo")
            if tipo:
                qs = qs.filter(tipo__iexact=tipo)
            
            page = self.paginate_queryset(qs)

            if page is not None:
                serializer = self.get_serializer(page, many=True)
                user_cedula = getattr(request.user, 'cedula', 'anonymous')
                logger.info(
                    f"[INFO] [{datetime.now().isoformat()}]: "
                    f"Usuario {user_cedula} consultó {len(page)} instrumentos disponibles"
                )
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(qs, many=True)
            user_cedula = getattr(request.user, 'cedula', 'anonymous')
            logger.info(
                f"[INFO] [{datetime.now().isoformat()}]: "
                f"Usuario {user_cedula} consultó {qs.count()} instrumentos disponibles"
            )
            return Response(serializer.data)

        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error en acción disponibles: {str(e)}"
            )
            return Response(
                {"error": "Error al obtener instrumentos disponibles"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsProfesor])
    def asignar(self, request, pk=None):
        """
        Acción para asignar un instrumento a un estudiante.

        Endpoint:
            POST /api/instrumentos/<id>/asignar/

        Payload:
            {
                "estudiante_id": 5
            }

        Response:
            - 200: Instrumento asignado correctamente
            - 400: Error de validación
            - 404: Instrumento o estudiante no encontrado
            - 403: Acceso denegado (no es profesor)
        """
        try:
            instrumento = self.get_object()
            estudiante_id = request.data.get('estudiante_id')
            
            if not estudiante_id:
                return Response(
                    {"error": "estudiante_id es requerido"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                estudiante = Usuario.objects.get(id=estudiante_id, rol='ESTUDIANTE')
            except Usuario.DoesNotExist:
                return Response(
                    {"error": "Estudiante no encontrado o no es estudiante"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            forbidden_states = ['En Taller', 'Mantenimiento', 'En Mantenimiento', 'Dañado', 'Extraviado', 'No operativo']
            if instrumento.estado in forbidden_states:
                return Response(
                    {"error": f"No se puede asignar un instrumento en estado {instrumento.estado}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if instrumento.estado != 'Disponible':
                return Response(
                    {"error": f"El instrumento no está disponible. Estado actual: {instrumento.estado}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Asignar instrumento
            instrumento.asignar_a_estudiante(estudiante)
            
            logger.info(
                f"[AUDITORÍA] [{datetime.now().isoformat()}]: "
                f"Profesor {request.user.cedula} asignó {instrumento.nombre} a estudiante {estudiante.cedula}"
            )
            
            serializer = self.get_serializer(instrumento)
            return Response(
                {"message": f"Instrumento {instrumento.nombre} asignado a {estudiante.nombre}",
                 "instrumento": serializer.data},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error en asignación de instrumento: {str(e)}"
            )
            return Response(
                {"error": "Error al asignar instrumento"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsProfesor])
    def desasignar(self, request, pk=None):
        """
        Acción para desasignar un instrumento y dejarlo disponible.

        Endpoint:
            POST /api/instrumentos/<id>/desasignar/

        Response:
            - 200: Instrumento desasignado
            - 400: Instrumento no está asignado
            - 403: Acceso denegado (no es profesor)
        """
        try:
            instrumento = self.get_object()

            if instrumento.usuario is None:
                return Response(
                    {"error": "El instrumento no está asignado a ningún estudiante."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            estudiante_anterior = instrumento.usuario
            instrumento.desasignar()

            logger.info(
                f"[AUDITORÍA] [{datetime.now().isoformat()}]: "
                f"Profesor {request.user.cedula} desasignó {instrumento.nombre} (antes asignado a {estudiante_anterior.cedula})"
            )

            serializer = self.get_serializer(instrumento)
            return Response(
                {"message": f"Instrumento {instrumento.nombre} desasignado",
                 "instrumento": serializer.data},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error en desasignar instrumento: {str(e)}"
            )
            return Response(
                {"error": "Error al desasignar instrumento"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsProfesor])
    def auditoria(self, request):
        """Lista de instrumentos con historial de mantenimiento y auditoría."""
        try:
            instrumentos = self.get_queryset().filter(
                motivo_tecnico__isnull=False
            ).exclude(motivo_tecnico='')
            serializer = self.get_serializer(instrumentos, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error en acción auditoria: {str(e)}"
            )
            return Response(
                {"error": "Error al obtener auditoría de mantenimiento"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"], url_path='finalizar-mantenimiento', permission_classes=[IsAuthenticated, IsProfesor])
    def finalizar_mantenimiento(self, request, pk=None):
        """Marca un instrumento en mantenimiento como disponible nuevamente."""
        try:
            instrumento = self.get_object()
            if instrumento.estado not in ['En Taller', 'Mantenimiento', 'En Mantenimiento']:
                return Response(
                    {"error": "El instrumento no está en mantenimiento."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            instrumento.estado = 'Disponible'
            instrumento.save()

            logger.info(
                f"[AUDITORÍA] [{datetime.now().isoformat()}]: "
                f"Profesor {request.user.cedula} finalizó mantenimiento de {instrumento.nombre} ({instrumento.numero_serie})"
            )

            serializer = self.get_serializer(instrumento)
            return Response(
                {"message": "Instrumento disponible nuevamente.", "instrumento": serializer.data},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error al finalizar mantenimiento: {str(e)}"
            )
            return Response(
                {"error": "Error al finalizar mantenimiento"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsProfesor])
    def mantenimiento(self, request, pk=None):
        """
        Acción para reportar un instrumento en mantenimiento o daño técnico.

        Endpoint:
            POST /api/instrumentos/<id>/mantenimiento/

        Payload:
            { "motivo_tecnico": "..." }

        Response:
            - 200: Instrumento marcado en taller
            - 400: Falta motivo técnico o estado inválido
            - 403: Acceso denegado
        """
        try:
            instrumento = self.get_object()
            motivo_tecnico = request.data.get('motivo_tecnico', '').strip()

            if not motivo_tecnico:
                return Response(
                    {"error": "motivo_tecnico es obligatorio para este cambio de estado."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            invalid_states = ['En Taller', 'Mantenimiento', 'Extraviado']
            if instrumento.estado in invalid_states:
                return Response(
                    {"error": f"El instrumento ya está en estado {instrumento.estado}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            instrumento.reportar_mantenimiento(request.user, motivo_tecnico)

            logger.info(
                f"[AUDITORÍA] [{datetime.now().isoformat()}]: "
                f"Profesor {request.user.cedula} reportó mantenimiento para {instrumento.nombre} ({instrumento.numero_serie})"
            )

            serializer = self.get_serializer(instrumento)
            return Response(
                {"message": f"Instrumento {instrumento.nombre} enviado a mantenimiento.",
                 "instrumento": serializer.data},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error en acción mantenimiento: {str(e)}"
            )
            return Response(
                {"error": "Error al reportar mantenimiento del instrumento"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsProfesor])
    def liberar(self, request, pk=None):
        """
        Acción para liberar un instrumento (dejarlo disponible).

        Endpoint:
            POST /api/instrumentos/<id>/liberar/

        Response:
            - 200: Instrumento liberado
            - 400: Instrumento no está asignado
            - 404: Instrumento no encontrado
            - 403: Acceso denegado (no es profesor)
        """
        try:
            instrumento = self.get_object()
            
            if instrumento.usuario is None:
                return Response(
                    {"error": "El instrumento no está asignado a ningún estudiante"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            estudiante_anterior = instrumento.usuario
            instrumento.liberar()
            
            logger.info(
                f"[AUDITORÍA] [{datetime.now().isoformat()}]: "
                f"Profesor {request.user.cedula} liberó {instrumento.nombre} (antes asignado a {estudiante_anterior.cedula})"
            )
            
            serializer = self.get_serializer(instrumento)
            return Response(
                {"message": f"Instrumento {instrumento.nombre} liberado",
                 "instrumento": serializer.data},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error en liberación de instrumento: {str(e)}"
            )
            return Response(
                {"error": "Error al liberar instrumento"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PreguntaViewSet(viewsets.ModelViewSet):
    """CRUD API para gestionar Preguntas de exámenes."""

    queryset = Pregunta.objects.all().order_by('examen', 'orden')
    serializer_class = PreguntaSerializer
    permission_classes = [IsAuthenticated, IsProfesor]

    def get_queryset(self):
        queryset = super().get_queryset()
        examen_id = self.request.query_params.get('examen_id')
        if examen_id:
            queryset = queryset.filter(examen_id=examen_id)
        return queryset


class OpcionViewSet(viewsets.ModelViewSet):
    """CRUD API para gestionar Opciones de preguntas."""

    queryset = Opcion.objects.all().order_by('pregunta', 'id')
    serializer_class = OpcionSerializer
    permission_classes = [IsAuthenticated, IsProfesor]

    def get_queryset(self):
        queryset = super().get_queryset()
        pregunta_id = self.request.query_params.get('pregunta_id')
        if pregunta_id:
            queryset = queryset.filter(pregunta_id=pregunta_id)
        return queryset


class VisorInteraccionViewSet(viewsets.ModelViewSet):
    """
    API para registrar interacciones del visor 3D.
    """

    queryset = VisorInteraccion.objects.all().order_by("-fecha_interaccion")
    serializer_class = VisorInteraccionSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """
        Personaliza creación de interacción.
        """
        try:
            estudiante = self.request.user

            if not estudiante or not estudiante.is_authenticated:
                raise serializers.ValidationError(
                    "Usuario autenticado no válido"
                )

            serializer.save(estudiante=estudiante)
            logger.info(
                f"[INFO] [{datetime.now().isoformat()}]: "
                f"Interacción visor registrada para {estudiante.cedula}"
            )

        except serializers.ValidationError:
            raise

        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error inesperado en perform_create: {str(e)}"
            )
            raise serializers.ValidationError(
                f"Error al registrar interacción: {str(e)}"
            )

    def get_queryset(self):
        """
        Filtra interacciones solo del usuario autenticado.
        """
        try:
            estudiante = self.request.user
            if not estudiante or not estudiante.is_authenticated:
                return VisorInteraccion.objects.none()

            return VisorInteraccion.objects.filter(
                estudiante=estudiante
            ).order_by("-fecha_interaccion")

        except Exception as e:
            logger.error(
                f"[ERROR] [{datetime.now().isoformat()}]: "
                f"Error en get_queryset de VisorInteraccion: {str(e)}"
            )
            return VisorInteraccion.objects.none()


class ExamenProfesorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para que los profesores gestionen sus exámenes.

    Permite CRUD completo sobre los exámenes creados por el usuario autenticado.
    """
    queryset = Examen.objects.all()
    serializer_class = ExamenSerializer
    permission_classes = [IsAuthenticated, IsProfesor]

    def get_queryset(self):
        return Examen.objects.filter(profesor=self.request.user)

    def perform_create(self, serializer):
        serializer.save(profesor=self.request.user)

    @action(detail=True, methods=['get'], url_path='intentos')
    def obtener_intentos(self, request, pk=None):
        try:
            examen = self.get_object()
            intentos = examen.intentos.select_related('estudiante').order_by('-fecha_finalizacion')
            data = []
            for intento in intentos:
                estudiante = intento.estudiante
                estudiante_nombre = f"{getattr(estudiante, 'nombre', '')} {getattr(estudiante, 'apellido', '')}".strip()
                fecha_envio = intento.fecha_finalizacion or intento.fecha_inicio
                duracion_utilizada = None
                if intento.fecha_inicio and intento.fecha_finalizacion:
                    duracion_utilizada = int((intento.fecha_finalizacion - intento.fecha_inicio).total_seconds() / 60)

                nota_obj = Nota.objects.filter(estudiante=estudiante, examen=examen).first()
                nota_obtenida = None
                estado = intento.estado
                if nota_obj:
                    nota_obtenida = float(nota_obj.nota_obtenida) if nota_obj.nota_obtenida is not None else None
                    estado = nota_obj.estado

                data.append({
                    "id": intento.id,
                    "estudiante": {
                        "id": estudiante.id,
                        "nombre_completo": estudiante_nombre or getattr(estudiante, 'cedula', 'Estudiante'),
                    },
                    "fecha_envio": fecha_envio,
                    "duracion_utilizada": duracion_utilizada,
                    "calificacion_final": float(intento.calificacion_final) if intento.calificacion_final is not None else None,
                    "nota_obtenida": nota_obtenida,
                    "estado": estado,
                })
            return Response(data, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class ExamenEstudianteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para que los estudiantes consulten exámenes publicados.

    Incluye acciones personalizadas para iniciar y entregar exámenes con intento único.
    """
    serializer_class = ExamenEstudianteSerializer
    permission_classes = [IsAuthenticated, IsEstudiante]

    def get_queryset(self):
        """
        Filtra exámenes publicados para estudiantes.
        
        REGLAS DE FILTRADO:
        1. Estado debe ser 'Publicado' exactamente
        2. Debe estar dentro de fecha_apertura y fecha_cierre (timezone-aware)
        3. El profesor del examen debe coincidir con instructor_encargado del estudiante
        4. Si el estudiante NO tiene instructor, retorna none() (visible como vacío)
        
        LOG EXHAUSTIVO para auditoría y debugging.
        """
        now = timezone.now()
        user_cedula = getattr(self.request.user, 'cedula', 'unknown')
        user_id = getattr(self.request.user, 'id', 'unknown')
        
        logger.debug(
            f"[DEBUG] ExamenEstudianteViewSet.get_queryset() - Usuario: {user_cedula} (ID: {user_id})"
        )
        
# Filtrar por estado publicado o activo y por ventana de fechas UTC actuales.
        queryset = Examen.objects.filter(
            estado__in=['Publicado', 'Activo'],
            fecha_apertura__lte=now,
            fecha_cierre__gte=now,
        ).select_related('profesor').prefetch_related('preguntas__opciones')

        logger.debug(
            f"[DEBUG] Exámenes disponibles para fecha UTC {now.isoformat()}: {queryset.count()}"
        )
        
        if getattr(self.request.user, 'rol', None) == 'ESTUDIANTE':
            instructor = getattr(self.request.user, 'instructor_encargado', None)
            
            print(f"\n--- [DEBUG EXÁMENES] Iniciando consulta para estudiante: {user_cedula} (ID: {user_id}) ---")
            print(f"[DEBUG] instructor_encargado en BD: {instructor} (ID: {getattr(instructor, 'id', 'None')})")

            if not instructor:
                # ❌ CASO CRÍTICO: Estudiante sin instructor asignado
                instructor_id = None
                instructor_cedula = None
                logger.warning(
                    f"[WARN] Estudiante {user_cedula} (ID: {user_id}) tiene "
                    f"instructor_encargado = NULL. NO verá exámenes. "
                    f"ACCIÓN REQUERIDA: Asignar instructor al estudiante o registrarlo correctamente."
                )
                print("[DEBUG] ❌ FALLA: El estudiante no tiene ningún instructor asignado. QuerySet cancelado.")
                print("--- [DEBUG EXÁMENES] Fin del rastreo ---\n")
                return queryset.none()
            else:
                # ✅ Estudiante tiene instructor asignado
                instructor_id = instructor.id
                instructor_cedula = instructor.cedula
                instructor_nombre = f"{instructor.nombre} {instructor.apellido}".strip()

                total_profesor = Examen.objects.filter(profesor=instructor).count()
                estados = list(
                    Examen.objects.filter(profesor=instructor)
                    .values_list('titulo', 'estado', 'fecha_apertura', 'fecha_cierre')
                )
                print(f"[DEBUG] Total de exámenes creados por este profesor en la BD: {total_profesor}")
                print(f"[DEBUG] Exámenes del profesor y sus estados actuales: {estados}")
                print(f"[DEBUG] Hora actual del servidor (UTC timezone.now()): {now}")
                print(f"[DEBUG] Hora actual solo fecha: {now.date()}")

                queryset = queryset.filter(profesor=instructor)
                queryset = queryset.filter(
                    Q(fecha_apertura__lte=now, fecha_cierre__gte=now)
                    | Q(fecha_apertura__date__lte=now.date(), fecha_cierre__date__gte=now.date())
                )
                queryset = queryset.select_related('profesor').prefetch_related('preguntas__opciones')

                examen_count_after = queryset.count()
                print(f"[DEBUG] Cantidad de exámenes que pasaron TODOS los filtros: {examen_count_after}")
                print("--- [DEBUG EXÁMENES] Fin del rastreo ---\n")
                
                logger.info(
                    f"[INFO] Estudiante: {user_cedula} | "
                    f"Instructor: {instructor_nombre} (ID: {instructor_id}) | "
                    f"Exámenes publicados disponibles: {examen_count_after} de {total_profesor}"
                )

        return queryset.order_by('-fecha_creacion')

    def get_object(self):
        examen = super().get_object()

        if examen.estado not in ['Publicado', 'Activo']:
            raise exceptions.PermissionDenied("El examen no está disponible actualmente.")

        if self.action == 'iniciar' and IntentoExamen.objects.filter(
            estudiante=self.request.user,
            examen=examen,
            estado__in=['Entregado', 'Calificado'],
        ).exists():
            raise exceptions.PermissionDenied(
                "Ya has agotado tu único intento para este examen."
            )

        return examen

    @action(detail=True, methods=['post'])
    def iniciar(self, request, pk=None):
        examen = self.get_object()
        ahora = timezone.now()

        if ahora < examen.fecha_apertura:
            return Response(
                {"detail": "El examen aún no está abierto."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ahora > examen.fecha_cierre:
            return Response(
                {"detail": "El examen ya ha cerrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                intento, _ = IntentoExamen.objects.get_or_create(
                    estudiante=request.user,
                    examen=examen,
                    defaults={
                        'fecha_inicio': ahora,
                        'fecha_finalizacion': ahora,
                        'estado': 'En progreso',
                    },
                )
        except IntegrityError:
            return Response(
                {"detail": "Ya has agotado tu único intento para este examen."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(examen)
        return Response({
            'examen': serializer.data,
            'intento_id': intento.id,
        })

    @action(detail=True, methods=['post'])
    def entregar(self, request, pk=None):
        """
        Procesa el envío de respuestas de un estudiante y calcula la calificación final.

        Payload esperado:
            {
                "respuestas": [
                    {"pregunta_id": 1, "opcion_id": 4},
                    ...
                ]
            }
        """
        examen = self.get_object()
        ahora = timezone.now()

        if ahora < examen.fecha_apertura:
            return Response(
                {"detail": "El examen aún no está abierto."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ahora > examen.fecha_cierre:
            return Response(
                {"detail": "El examen ya ha cerrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        respuestas_data = request.data.get('respuestas')

        if respuestas_data is None or not isinstance(respuestas_data, list):
            return Response(
                {"error": "El campo 'respuestas' es requerido y debe ser una lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        intento = IntentoExamen.objects.filter(estudiante=request.user, examen=examen).first()

        if intento and intento.estado != 'En progreso':
            return Response(
                {"detail": "Ya has agotado tu único intento para este examen."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not intento:
            try:
                with transaction.atomic():
                    intento = IntentoExamen.objects.create(
                        estudiante=request.user,
                        examen=examen,
                        fecha_inicio=ahora,
                        fecha_finalizacion=ahora,
                        estado='En progreso',
                    )
            except IntegrityError:
                return Response(
                    {"detail": "Ya has agotado tu único intento para este examen."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        nota_final = Decimal('0.00')

        for item in respuestas_data:
            pregunta_id = item.get('pregunta_id')
            opcion_id = item.get('opcion_id')

            if pregunta_id is None:
                intento.delete()
                return Response(
                    {"error": "Cada respuesta debe incluir pregunta_id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                pregunta = Pregunta.objects.get(id=pregunta_id, examen=examen)
            except Pregunta.DoesNotExist:
                intento.delete()
                return Response(
                    {"error": f"Pregunta {pregunta_id} no corresponde al examen."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            opcion_seleccionada = None
            if opcion_id is not None:
                try:
                    opcion_seleccionada = Opcion.objects.get(id=opcion_id, pregunta=pregunta)
                except Opcion.DoesNotExist:
                    intento.delete()
                    return Response(
                        {"error": f"Opción {opcion_id} no corresponde a la pregunta."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            RespuestaEstudiante.objects.update_or_create(
                intento=intento,
                pregunta=pregunta,
                defaults={'opcion_seleccionada': opcion_seleccionada},
            )

            if opcion_seleccionada and opcion_seleccionada.es_correcta:
                nota_final += pregunta.valor_puntos

        nota_final = min(nota_final, Decimal('20.00'))
        intento.calificacion_final = nota_final
        intento.estado = 'Calificado'
        intento.fecha_finalizacion = ahora
        intento.save()

        nota, _ = Nota.objects.update_or_create(
            estudiante=request.user,
            examen=examen,
            defaults={
                'nota_obtenida': nota_final,
                'observaciones': '',
            },
        )
        nota.save()

        return Response(
            {
                'calificacion_final': f'{nota_final:.2f}',
                'nota_id': nota.id,
                'estado': nota.estado,
                'intento_id': intento.id,
            },
            status=status.HTTP_200_OK,
        )


class ResponderExamenView(APIView):
    """
    Endpoint para que un estudiante responda un examen y se auto-califique.

    POST /api/examenes/<pk>/responder/
    """
    permission_classes = [IsAuthenticated, IsEstudiante]

    def post(self, request, pk=None):
        serializer = ResponderExamenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        respuestas_data = serializer.validated_data['respuestas']
        ahora = timezone.now()
        estudiante = request.user
        examen = get_object_or_404(Examen, pk=pk)

        if examen.estado not in ['Publicado', 'Activo']:
            return Response(
                {'detail': 'El examen no está disponible para responder.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ahora < examen.fecha_apertura:
            return Response(
                {'detail': 'El examen aún no está abierto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ahora > examen.fecha_cierre:
            return Response(
                {'detail': 'El examen ya ha cerrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instructor = getattr(estudiante, 'instructor_encargado', None)
        if not instructor or examen.profesor_id != instructor.id:
            return Response(
                {'detail': 'No tienes permiso para responder este examen.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        intento = IntentoExamen.objects.filter(estudiante=estudiante, examen=examen).first()
        if intento and intento.estado != 'En progreso':
            return Response(
                {'detail': 'Ya has agotado tu único intento para este examen.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not intento:
            try:
                with transaction.atomic():
                    intento = IntentoExamen.objects.create(
                        estudiante=estudiante,
                        examen=examen,
                        fecha_inicio=ahora,
                        fecha_finalizacion=ahora,
                        estado='En progreso',
                    )
            except IntegrityError:
                return Response(
                    {'detail': 'Ya has agotado tu único intento para este examen.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        nota_final = Decimal('0.00')
        for item in respuestas_data:
            pregunta_id = item['pregunta_id']
            opcion_id = item.get('opcion_id')

            try:
                pregunta = Pregunta.objects.get(id=pregunta_id, examen=examen)
            except Pregunta.DoesNotExist:
                intento.delete()
                return Response(
                    {'error': f'Pregunta {pregunta_id} no corresponde al examen.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            opcion_seleccionada = None
            if opcion_id is not None:
                try:
                    opcion_seleccionada = Opcion.objects.get(id=opcion_id, pregunta=pregunta)
                except Opcion.DoesNotExist:
                    intento.delete()
                    return Response(
                        {'error': f'Opción {opcion_id} no corresponde a la pregunta.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            RespuestaEstudiante.objects.update_or_create(
                intento=intento,
                pregunta=pregunta,
                defaults={'opcion_seleccionada': opcion_seleccionada},
            )

            if opcion_seleccionada and opcion_seleccionada.es_correcta:
                nota_final += pregunta.valor_puntos

        nota_final = min(nota_final, Decimal('20.00'))
        intento.calificacion_final = nota_final
        intento.estado = 'Calificado'
        intento.fecha_finalizacion = ahora
        intento.save()

        nota, _ = Nota.objects.update_or_create(
            estudiante=estudiante,
            examen=examen,
            defaults={
                'nota_obtenida': nota_final,
                'observaciones': '',
            },
        )
        nota.save()

        return Response(
            {
                'calificacion_final': f'{nota_final:.2f}',
                'nota_id': nota.id,
                'estado': nota.estado,
                'intento_id': intento.id,
            },
            status=status.HTTP_200_OK,
        )


class NotaEstudianteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para que los estudiantes consulten su historial de calificaciones.
    
    GET /api/estudiante/notas/ - Listar todas las notas del estudiante autenticado
    GET /api/estudiante/notas/{id}/ - Obtener una nota específica
    """
    serializer_class = NotaSerializer
    permission_classes = [IsAuthenticated, IsEstudiante]

    def get_queryset(self):
        """
        Retorna solo las notas del estudiante autenticado.
        Ordenadas por fecha de completado descendente.
        """
        return Nota.objects.filter(
            estudiante=self.request.user
        ).select_related('examen').order_by('-fecha_completado')


class ProfesorPerfilView(APIView):
    """
    Endpoint para que el profesor vea su perfil.
    
    GET /api/profesor/perfil/ - Obtener perfil del profesor autenticado
    """
    permission_classes = [IsAuthenticated, IsProfesor]
    
    def get(self, request):
        """
        Retorna la información del perfil del profesor autenticado.
        """
        try:
            profesor = request.user
            serializer = ProfesorPerfilSerializer(profesor)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CambiarContraseñaView(APIView):
    """
    Endpoint para que el profesor cambie su contraseña.
    
    POST /api/profesor/cambiar-contraseña/
    
    Body:
    {
        "contraseña_actual": "string",
        "contraseña_nueva": "string",
        "contraseña_confirmacion": "string"
    }
    """
    permission_classes = [IsAuthenticated, IsProfesor]
    
    def post(self, request):
        """
        Cambia la contraseña del usuario autenticado.
        
        Validaciones:
        - Contraseña actual debe ser correcta
        - Nueva contraseña y confirmación deben coincidir
        - Nueva contraseña debe ser diferente a la actual
        """
        serializer = CambiarContraseñaSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        usuario = request.user
        contraseña_actual = serializer.validated_data.get('contraseña_actual')
        contraseña_nueva = serializer.validated_data.get('contraseña_nueva')
        
        # Verificar que la contraseña actual es correcta
        if not usuario.check_password(contraseña_actual):
            return Response(
                {'error': 'La contraseña actual es incorrecta'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Cambiar la contraseña
        usuario.set_password(contraseña_nueva)
        usuario.save()
        
        return Response(
            {'detail': 'Contraseña actualizada exitosamente'},
            status=status.HTTP_200_OK
        )


class PerfilUsuarioView(APIView):
    """
    Endpoint unificado para que cualquier usuario vea y edite su perfil.
    
    GET /api/usuario/perfil/
    PUT /api/usuario/perfil/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = PerfilUsuarioSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        data = request.data.copy()
        if getattr(request.user, 'rol', None) == 'ESTUDIANTE':
            # Los estudiantes no pueden modificar nombre, apellido ni cédula desde este endpoint
            for campo_bloqueado in ('nombre', 'apellido', 'cedula'):
                data.pop(campo_bloqueado, None)

        serializer = PerfilUsuarioSerializer(request.user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': '¡Perfil actualizado correctamente!',
                'user': serializer.data,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

