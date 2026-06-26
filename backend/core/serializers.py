from decimal import Decimal, InvalidOperation
from django.utils.html import strip_tags
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Instrumento, Usuario, VisorInteraccion, Examen, Pregunta, Opcion,
    IntentoExamen, RespuestaEstudiante, Nota
)
import logging
from datetime import datetime
from django.utils import timezone
from django.db import transaction, IntegrityError

logger = logging.getLogger(__name__)


def _sanitize_text(value):
    if not isinstance(value, str):
        return value
    return strip_tags(value).strip()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializador personalizado para autenticación con cédula y JWT.
    
    Inyecta datos del usuario incluyendo instructor_encargado en el payload
    para que el frontend tenga acceso a esta información crítica.
    """

    username_field = 'cedula'

    def validate(self, attrs):
        try:
            # Aliasing para compatibilidad con payloads que envían username
            if 'cedula' not in attrs and 'username' in attrs:
                attrs['cedula'] = attrs['username']

            data = super().validate(attrs)
            user = getattr(self, 'user', None)

            if not user:
                raise serializers.ValidationError('Usuario autenticado no encontrado')

            usuario = Usuario.objects.get(cedula=user.cedula)
            
            # Preparar datos del instructor si está asignado
            instructor_encargado_data = None
            instructor_nombre = None
            instructor_rango = None
            instructor_id = None
            
            if usuario.instructor_encargado:
                instructor_encargado_data = {
                    'id': usuario.instructor_encargado.id,
                    'cedula': usuario.instructor_encargado.cedula,
                    'nombre': usuario.instructor_encargado.nombre,
                    'apellido': usuario.instructor_encargado.apellido,
                    'rango_militar': usuario.instructor_encargado.rango_militar,
                }
                instructor_nombre = f"{usuario.instructor_encargado.nombre} {usuario.instructor_encargado.apellido}".strip()
                instructor_rango = usuario.instructor_encargado.rango_militar
                instructor_id = usuario.instructor_encargado.id
            else:
                # ⚠️ CASO CRÍTICO: Estudiante sin instructor
                if usuario.rol == 'ESTUDIANTE':
                    logger.warning(
                        f"[WARN] Estudiante {usuario.cedula} ({usuario.nombre} {usuario.apellido}) "
                        f"logueado sin instructor_encargado asignado. "
                        f"NO verá exámenes en /api/estudiante/examenes/"
                    )
            
            # Preparar payload JWT
            data['usuario'] = {
                'id': usuario.id,
                'cedula': usuario.cedula,
                'nombre': usuario.nombre,
                'apellido': usuario.apellido,
                'email': usuario.email,
                'rol': usuario.rol,
                'activo': usuario.activo,
                'carrera': usuario.carrera,
                'semestre': usuario.semestre,
                'rango_militar': usuario.rango_militar,
                'instrumento_asignado': usuario.instrumento_asignado,
                'instructor_encargado': instructor_encargado_data,
                'instructor_nombre': instructor_nombre,
                'instructor_id': instructor_id,
                'instructor_rango': instructor_rango,
            }
            
            logger.info(
                f"[INFO] Login exitoso: {usuario.cedula} ({usuario.rol}) | "
                f"Instructor: {instructor_nombre or 'None (⚠️ CRÍTICO SI ES ESTUDIANTE)'}"
            )
            
            return data

        except Usuario.DoesNotExist:
            logger.error(
                f"[ERROR] Usuario personalizado no encontrado en login. "
                f"Cedula: {getattr(self, 'user', {}).cedula if hasattr(self, 'user') else 'unknown'}"
            )
            raise serializers.ValidationError('Usuario no registrado en Bandwar')
        except serializers.ValidationError:
            raise
        except Exception as exc:
            logger.exception(
                f"[ERROR] Excepción en CustomTokenObtainPairSerializer.validate"
            )
            raise serializers.ValidationError(f'Error al procesar login: {str(exc)}')


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'id',
            'cedula',
            'nombre',
            'apellido',
            'email',
            'rol',
            'carrera',
            'semestre',
            'rango_militar',
            'fecha_registro',
            'activo',
        ]
        read_only_fields = ['id', 'fecha_registro']

    def validate_email(self, value):
        """
        Valida que el email no esté duplicado (excepto el usuario actual).
        """
        usuario = self.instance
        if Usuario.objects.exclude(id=usuario.id if usuario else None).filter(
            email=value
        ).exists():
            raise serializers.ValidationError('Este email ya está registrado')
        return value


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Usuario
        fields = [
            'nombre',
            'apellido',
            'cedula',
            'rol',
            'carrera',
            'semestre',
            'rango_militar',
            'instrumento_asignado',
            'password',
        ]
        read_only_fields = ['cedula', 'rol', 'instrumento_asignado']

    def validate_password(self, value):
        if value and len(value) < 6:
            raise serializers.ValidationError('La nueva contraseña debe tener al menos 6 caracteres.')
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        instance.rango_militar = validated_data.get('rango_militar', instance.rango_militar)

        if getattr(instance, 'rol', '').upper() == 'ESTUDIANTE':
            instance.carrera = validated_data.get('carrera', instance.carrera)
            instance.semestre = validated_data.get('semestre', instance.semestre)

        if password:
            instance.set_password(password)
        instance.save()
        return instance

    def validate_cedula(self, value):
        """
        Valida que la cédula no esté duplicada.
        """
        usuario = self.instance
        if Usuario.objects.exclude(id=usuario.id if usuario else None).filter(
            cedula=value
        ).exists():
            raise serializers.ValidationError('Esta cédula ya está registrada')
        return value


class RegistroAlumnoSerializer(serializers.Serializer):
    """Serializador para el registro cerrado de alumnos por parte de un profesor."""

    cedula = serializers.CharField(max_length=20)
    nombre = serializers.CharField(max_length=100)
    apellido = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    password = serializers.CharField(max_length=128, required=False, write_only=True)
    carrera = serializers.CharField(max_length=150)
    semestre = serializers.IntegerField(min_value=1)
    rango_militar = serializers.CharField(max_length=100, required=False, allow_blank=True)

    DEFAULT_PASSWORD = 'Bandwar2026!'

    def validate_cedula(self, value):
        if Usuario.objects.filter(cedula=value).exists():
            raise serializers.ValidationError('La cédula ya está registrada')
        return value

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError('El email ya está registrado')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None) or self.DEFAULT_PASSWORD
        usuario = Usuario.objects.create_user(
            cedula=validated_data['cedula'],
            password=password,
            nombre=validated_data['nombre'],
            apellido=validated_data['apellido'],
            email=validated_data['email'],
            rol='ESTUDIANTE',
            activo=True,
            carrera=validated_data.get('carrera', ''),
            semestre=validated_data.get('semestre'),
            rango_militar=validated_data.get('rango_militar', ''),
        )
        return usuario


class InstrumentoAsignadoSerializer(serializers.ModelSerializer):
    """Serializa los datos básicos del instrumento asignado a un estudiante."""

    class Meta:
        model = Instrumento
        fields = [
            'id',
            'nombre',
            'marca',
            'modelo',
            'numero_serie',
            'estado',
        ]


class AlumnoSerializer(serializers.ModelSerializer):
    """Serializador de estudiantes con su instrumento asignado vigente."""

    nombre_completo = serializers.SerializerMethodField(read_only=True)
    instrumento_asignado = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'cedula',
            'nombre_completo',
            'email',
            'carrera',
            'semestre',
            'rango_militar',
            'instrumento_asignado',
        ]

    def get_nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}" if obj.nombre and obj.apellido else obj.cedula

    def get_instrumento_asignado(self, obj):
        instrument = obj.instrumentos.filter(usuario=obj).first()
        if instrument:
            return InstrumentoAsignadoSerializer(instrument).data
        return None


class AsignarInstrumentoSerializer(serializers.Serializer):
    """Valida la asignación de un instrumento a un estudiante."""

    estudiante_id = serializers.IntegerField()
    instrumento_id = serializers.IntegerField()

    def validate_estudiante_id(self, value):
        try:
            estudiante = Usuario.objects.get(id=value)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError('El estudiante especificado no existe')

        if estudiante.rol != 'ESTUDIANTE':
            raise serializers.ValidationError('Solo se pueden asignar instrumentos a estudiantes')

        return estudiante

    def validate_instrumento_id(self, value):
        try:
            instrumento = Instrumento.objects.get(id=value)
        except Instrumento.DoesNotExist:
            raise serializers.ValidationError('El instrumento especificado no existe')

        if instrumento.usuario is not None:
            raise serializers.ValidationError('El instrumento ya está asignado a otro estudiante')

        if instrumento.estado.lower() != 'disponible':
            raise serializers.ValidationError('El instrumento no está disponible para asignación')

        return instrumento

    def validate(self, attrs):
        attrs['estudiante'] = attrs.pop('estudiante_id')
        attrs['instrumento'] = attrs.pop('instrumento_id')
        return attrs

    def save(self):
        estudiante = self.validated_data['estudiante']
        instrumento = self.validated_data['instrumento']

        instrumento.usuario = estudiante
        instrumento.estado = 'Asignado'
        instrumento.save()

        estudiante.instrumento_asignado = instrumento.nombre
        estudiante.save(update_fields=['instrumento_asignado'])

        return {
            'estudiante': estudiante,
            'instrumento': instrumento,
        }
class InstrumentoSerializer(serializers.ModelSerializer):
    """
    Serializer completo para Instrumento con validaciones y campos extendidos.
    
    - Permite lectura de todos los campos
    - Validación de numero_serie único
    - Información completa del usuario (nombre, apellido)
    - Información del modelo 3D
    """
    usuario = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(), 
        allow_null=True, 
        required=False,
        help_text='ID del estudiante al que está asignado'
    )
    ultimo_alumno_asignado = serializers.PrimaryKeyRelatedField(read_only=True)
    ultimo_alumno_asignado_nombre = serializers.SerializerMethodField(read_only=True)
    numero_serie = serializers.CharField(read_only=True)
    usuario_nombre = serializers.SerializerMethodField(read_only=True)
    usuario_cedula = serializers.SerializerMethodField(read_only=True)
    ultimo_responsable = serializers.PrimaryKeyRelatedField(read_only=True)
    ultimo_responsable_nombre = serializers.SerializerMethodField(read_only=True)
    modelo_3d = serializers.SerializerMethodField(read_only=True)

    ALLOWED_NOMBRES = ['Bombo', 'Platillos', 'Lira', 'Redoblante', 'Granaderos', 'Tambor Mayor', 'Trompeta']

    class Meta:
        model = Instrumento
        fields = [
            'id',
            'nombre',
            'tipo',
            'marca',
            'modelo',
            'numero_serie',
            'estado',
            'descripcion',
            'usuario',
            'usuario_nombre',
            'usuario_cedula',
            'ultimo_alumno_asignado',
            'ultimo_alumno_asignado_nombre',
            'ultimo_responsable',
            'ultimo_responsable_nombre',
            'motivo_tecnico',
            'modelo_3d_url',
            'modelo_3d',  # Campo computado con la ruta correcta
            'fecha_registro',
            'fecha_actualizacion',
            'activo',
        ]
        extra_kwargs = {
            'numero_serie': {'allow_null': True, 'required': False}
        }
        # Para creación desde frontend solo permitimos enviar `nombre`.
        read_only_fields = [
            'numero_serie',
            'id', 'fecha_registro', 'fecha_actualizacion',
            'usuario_nombre', 'usuario_cedula', 'modelo_3d', 'modelo_3d_url',
            'marca', 'tipo', 'estado', 'modelo', 'descripcion', 'usuario',
            'ultimo_alumno_asignado', 'ultimo_responsable', 'motivo_tecnico'
        ]

    def get_usuario_nombre(self, obj):
        """Retorna nombre completo del estudiante asignado"""
        if obj.usuario:
            return f"{obj.usuario.nombre} {obj.usuario.apellido}".strip()
        return None

    def get_usuario_cedula(self, obj):
        """Retorna cédula del estudiante asignado"""
        if obj.usuario:
            return obj.usuario.cedula
        return None

    def get_ultimo_responsable_nombre(self, obj):
        if obj.ultimo_responsable:
            return f"{obj.ultimo_responsable.nombre} {obj.ultimo_responsable.apellido}".strip()
        return None
    def get_ultimo_alumno_asignado_nombre(self, obj):
        if obj.ultimo_alumno_asignado:
            return f"{obj.ultimo_alumno_asignado.nombre} {obj.ultimo_alumno_asignado.apellido}".strip()
        return None
    def get_modelo_3d(self, obj):
        """Retorna la ruta del modelo 3D (priorizando modelo_3d_url)"""
        return obj.get_modelo_3d_path()

    def validate_numero_serie(self, value):
        """
        Valida que el número de serie no sea una cadena vacía y sea único.
        """
        if value is not None and str(value).strip() == '':
            raise serializers.ValidationError('El número de serie es obligatorio')

        instrumento = self.instance
        query = Instrumento.objects.filter(numero_serie=value)
        if instrumento:
            query = query.exclude(id=instrumento.id)
        
        if value is not None and query.exists():
            raise serializers.ValidationError(
                "Este número de serie ya está registrado en otro instrumento"
            )
        return value
    
    def validate_tipo(self, value):
        """Valida que el tipo sea uno de los permitidos"""
        tipos_validos = [choice[0] for choice in Instrumento.TIPO_CHOICES]
        if value not in tipos_validos:
            raise serializers.ValidationError(
                f"Tipo inválido. Tipos permitidos: {', '.join(tipos_validos)}"
            )
        return value
    
    def validate_estado(self, value):
        """Valida que el estado sea uno de los permitidos"""
        estados_validos = [choice[0] for choice in Instrumento.ESTADO_CHOICES]
        if value not in estados_validos:
            raise serializers.ValidationError(
                f"Estado inválido. Estados permitidos: {', '.join(estados_validos)}"
            )
        return value
    
    def validate(self, attrs):
        """
        Validación a nivel del serializer.
        - Si usuario es None, el estado debe ser 'Disponible'
        - Si usuario no es None, el estado debe ser 'Asignado'
        - Si se envía numero_serie, no puede estar vacío o nulo.
        """
        numero_serie_raw = self.initial_data.get('numero_serie') if isinstance(self.initial_data, dict) else None
        if numero_serie_raw is not None and str(numero_serie_raw).strip() == '':
            raise serializers.ValidationError({'numero_serie': 'El número de serie es obligatorio'})

        usuario = attrs.get('usuario')
        estado = attrs.get('estado')
        
        # Si se modifica usuario o estado, validar la coherencia
        if usuario and estado == 'Disponible':
            # Cambiar automáticamente a Asignado si se asigna a un usuario
            attrs['estado'] = 'Asignado'
        
        if not usuario and estado == 'Asignado':
            # No puede estar "Asignado" sin usuario
            raise serializers.ValidationError(
                "No puede estar 'Asignado' sin un usuario. Cambiar estado a 'Disponible' o asignar a un estudiante."
            )
        
        return attrs



    # kept above


class VisorInteraccionSerializer(serializers.ModelSerializer):
    estudiante = serializers.PrimaryKeyRelatedField(read_only=True)
    instrumento = serializers.PrimaryKeyRelatedField(queryset=Instrumento.objects.all())

    class Meta:
        model = VisorInteraccion
        fields = [
            'id',
            'estudiante',
            'instrumento',
            'tiempo_visualizacion_segundos',
            'puntos_calientes_visitados',
            'rotaciones_realizadas',
            'zooms_realizados',
            'fecha_interaccion',
        ]
        read_only_fields = ['id', 'estudiante', 'fecha_interaccion']

    def validate_tiempo_visualizacion_segundos(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "El tiempo no puede ser negativo"
            )
        return value

    def validate_puntos_calientes_visitados(self, value):
        if not isinstance(value, (list, dict)):
            raise serializers.ValidationError(
                "puntos_calientes_visitados debe ser una lista o diccionario"
            )
        return value


class OpcionSerializer(serializers.ModelSerializer):
    """
    Serializa las opciones de respuesta de una pregunta.
    """
    pregunta = serializers.PrimaryKeyRelatedField(
        queryset=Pregunta.objects.all(),
        write_only=True,
        required=True,
    )
    pregunta_id = serializers.IntegerField(source='pregunta.id', read_only=True)

    class Meta:
        model = Opcion
        fields = ['id', 'pregunta', 'pregunta_id', 'texto', 'es_correcta']
        read_only_fields = ['id', 'pregunta_id']

    def validate_texto(self, value):
        value = _sanitize_text(value)
        if not value:
            raise serializers.ValidationError('El texto de la opción no puede estar vacío.')
        return value

    def validate(self, data):
        pregunta = data.get('pregunta')
        es_correcta = data.get('es_correcta', False)
        
        if es_correcta and pregunta.tipo in ['Seleccion Simple', 'Verdadero/Falso']:
            if pregunta.opciones.filter(es_correcta=True).exists():
                raise serializers.ValidationError({
                    "es_correcta": "Esta pregunta ya tiene una opción marcada como correcta. No puedes agregar otra."
                })
        
        return data


class PreguntaSerializer(serializers.ModelSerializer):
    """
    Serializa una pregunta y sus opciones anidadas.
    """
    opciones = OpcionSerializer(many=True, read_only=True)
    examen = serializers.PrimaryKeyRelatedField(
        queryset=Examen.objects.all(),
        write_only=True,
        required=True,
    )
    examen_id = serializers.IntegerField(source='examen.id', read_only=True)

    class Meta:
        model = Pregunta
        fields = ['id', 'enunciado', 'tipo', 'valor_puntos', 'orden', 'examen', 'examen_id', 'opciones']
        read_only_fields = ['id', 'examen_id']

    def to_internal_value(self, data):
        if 'valor_puntos' in data and isinstance(data['valor_puntos'], str):
            data = data.copy()
            data['valor_puntos'] = data['valor_puntos'].replace(',', '.')

        try:
            return super().to_internal_value(data)
        except serializers.ValidationError:
            raise
        except (InvalidOperation, ValueError):
            raise serializers.ValidationError({'valor_puntos': 'Formato de puntos inválido. Usa punto decimal.'})
        except Exception:
            raise serializers.ValidationError({'valor_puntos': 'Formato de puntos inválido.'})

    def validate_enunciado(self, value):
        value = _sanitize_text(value)
        if not value:
            raise serializers.ValidationError('El enunciado no puede estar vacío.')
        return value

    def validate_valor_puntos(self, value):
        """Valida que el valor en puntos sea positivo y no exceda 20.00."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("El valor en puntos debe ser mayor a 0")
        if value > Decimal('20.00'):
            raise serializers.ValidationError("El valor en puntos no puede exceder 20.00")
        return value

    def validate(self, data):
        examen = data.get('examen')
        puntos_nuevos = data.get('valor_puntos', Decimal('0.00'))
        puntos_actuales = self.instance.valor_puntos if self.instance else Decimal('0.00')

        suma_existente = sum(p.valor_puntos for p in examen.preguntas.all())
        suma_total_proyectada = (suma_existente - puntos_actuales) + puntos_nuevos

        if suma_total_proyectada > Decimal('20.00'):
            raise serializers.ValidationError({
                "valor_puntos": f"La suma total del examen no puede exceder 20 puntos. Suma actual proyectada: {suma_total_proyectada}"
            })

        return data


class ExamenSerializer(serializers.ModelSerializer):
    """
    Serializa un examen con sus preguntas anidadas.
    """
    instrucciones = serializers.CharField(required=False, allow_blank=True, default='')
    preguntas = PreguntaSerializer(many=True, read_only=True)

    class Meta:
        model = Examen
        fields = [
            'id', 'profesor', 'titulo', 'descripcion', 'instrucciones',
            'fecha_apertura', 'fecha_cierre', 'duracion_minutos', 'intentos_permitidos', 'estado',
            'fecha_creacion', 'fecha_actualizacion', 'preguntas'
        ]
        read_only_fields = ['id', 'profesor', 'fecha_creacion', 'fecha_actualizacion']

    def validate_titulo(self, value):
        value = _sanitize_text(value)
        if not value:
            raise serializers.ValidationError('El título del examen no puede estar vacío.')
        return value

    def validate_descripcion(self, value):
        return _sanitize_text(value)

    def validate_instrucciones(self, value):
        return _sanitize_text(value)

    def validate_duracion_minutos(self, value):
        if value <= 0:
            raise serializers.ValidationError('La duración debe ser mayor a cero.')
        if value > 105:
            raise serializers.ValidationError('La duración no puede exceder 105 minutos.')
        return value

    def validate_intentos_permitidos(self, value):
        if value != 1:
            raise serializers.ValidationError('Solo se permite un intento por examen.')
        return value

    def validate(self, attrs):
        fecha_apertura = attrs.get('fecha_apertura', getattr(self.instance, 'fecha_apertura', None))
        fecha_cierre = attrs.get('fecha_cierre', getattr(self.instance, 'fecha_cierre', None))
        if fecha_apertura and fecha_cierre and fecha_cierre <= fecha_apertura:
            raise serializers.ValidationError({'fecha_cierre': 'La fecha de cierre debe ser posterior a la fecha de apertura.'})
        return attrs


class ExamenEstudianteSerializer(ExamenSerializer):
    intento_id = serializers.SerializerMethodField(read_only=True)
    estado_intento = serializers.SerializerMethodField(read_only=True)
    calificacion_final = serializers.SerializerMethodField(read_only=True)
    fecha_intento = serializers.SerializerMethodField(read_only=True)

    class Meta(ExamenSerializer.Meta):
        fields = ExamenSerializer.Meta.fields + [
            'intento_id',
            'estado_intento',
            'calificacion_final',
            'fecha_intento',
        ]

    def get_intento(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request.user, 'is_authenticated', False):
            return None
        return IntentoExamen.objects.filter(estudiante=request.user, examen=obj).order_by('-fecha_inicio').first()

    def get_intento_id(self, obj):
        intento = self.get_intento(obj)
        return intento.id if intento else None

    def get_estado_intento(self, obj):
        intento = self.get_intento(obj)
        return intento.estado if intento else None

    def get_calificacion_final(self, obj):
        intento = self.get_intento(obj)
        return f"{intento.calificacion_final:.2f}" if intento and intento.calificacion_final is not None else None

    def get_fecha_intento(self, obj):
        intento = self.get_intento(obj)
        return intento.fecha_finalizacion if intento else None


class RespuestaEstudianteSerializer(serializers.ModelSerializer):
    """
    Serializa la respuesta de un estudiante a una pregunta.
    """

    class Meta:
        model = RespuestaEstudiante
        fields = ['id', 'pregunta', 'opcion_seleccionada']
        read_only_fields = ['id']


class RespuestaItemSerializer(serializers.Serializer):
    pregunta_id = serializers.IntegerField()
    opcion_id = serializers.IntegerField(required=False, allow_null=True)


class ResponderExamenSerializer(serializers.Serializer):
    respuestas = RespuestaItemSerializer(many=True)

    def validate_respuestas(self, value):
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError('El campo "respuestas" debe contener al menos una respuesta.')

        pregunta_ids = [item.get('pregunta_id') for item in value]
        if len(pregunta_ids) != len(set(pregunta_ids)):
            raise serializers.ValidationError('No se pueden repetir preguntas en las respuestas.')

        return value


class IntentoExamenSerializer(serializers.ModelSerializer):
    """
    Serializa un intento de examen con su calificación final.
    """
    respuestas = RespuestaEstudianteSerializer(many=True, read_only=True)

    class Meta:
        model = IntentoExamen
        fields = [
            'id', 'estudiante', 'examen', 'fecha_inicio', 'fecha_finalizacion',
            'calificacion_final', 'estado', 'respuestas'
        ]
        read_only_fields = ['id', 'estudiante', 'examen', 'calificacion_final']


class NotaSerializer(serializers.ModelSerializer):
    """
    Serializa las notas/calificaciones del estudiante.
    Incluye información del examen y estado de la calificación.
    """
    examen_titulo = serializers.CharField(source='examen.titulo', read_only=True)
    examen_descripcion = serializers.CharField(source='examen.descripcion', read_only=True)
    estudiante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Nota
        fields = [
            'id', 'estudiante', 'estudiante_nombre', 'examen', 'examen_titulo',
            'examen_descripcion', 'nota_obtenida', 'estado', 'fecha_completado',
            'observaciones'
        ]
        read_only_fields = ['id', 'estudiante', 'estado', 'fecha_completado']

    def get_estudiante_nombre(self, obj):
        return f"{obj.estudiante.nombre} {obj.estudiante.apellido}".strip()

class EditarAlumnoSerializer(serializers.ModelSerializer):
    """
    Serializer para editar datos de estudiante.
    Permite a profesores corregir la cédula en caso de error tipográfico.
    Solo valida unicidad de cédula cuando se intenta cambiar.
    """
    class Meta:
        model = Usuario
        fields = ['cedula', 'nombre', 'apellido', 'email', 'carrera', 'semestre', 'rango_militar']
        read_only_fields = ['email']  # El email no se edita directamente

    def validate_cedula(self, value):
        """
        Valida que la nueva cédula no esté duplicada (excepto la del usuario actual).
        """
        usuario = self.instance
        if usuario and Usuario.objects.exclude(id=usuario.id).filter(cedula=value).exists():
            raise serializers.ValidationError('Esta cédula ya está registrada en otro usuario')


class ProfesorPerfilSerializer(serializers.ModelSerializer):
    """
    Serializer para el perfil del profesor (lectura y edición limitada).
    Permite al profesor ver y editar su información personal.
    """
    nombre_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Usuario
        fields = ['id', 'cedula', 'nombre', 'apellido', 'nombre_completo', 'email', 'rol', 'fecha_registro']
        read_only_fields = ['id', 'cedula', 'email', 'rol', 'fecha_registro']
    
    def get_nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}".strip()


class CambiarContraseñaSerializer(serializers.Serializer):
    """
    Serializer para cambiar la contraseña del usuario.
    Valida contraseña actual antes de permitir cambio.
    """
    contraseña_actual = serializers.CharField(required=True, write_only=True)
    contraseña_nueva = serializers.CharField(required=True, write_only=True, min_length=6)
    contraseña_confirmacion = serializers.CharField(required=True, write_only=True, min_length=6)
    
    def validate(self, attrs):
        """Valida que contraseña nueva y confirmación sean idénticas."""
        if attrs.get('contraseña_nueva') != attrs.get('contraseña_confirmacion'):
            raise serializers.ValidationError({'contraseña_confirmacion': 'Las contraseñas no coinciden.'})
        if attrs.get('contraseña_nueva') == attrs.get('contraseña_actual'):
            raise serializers.ValidationError({'contraseña_nueva': 'La nueva contraseña debe ser diferente a la actual.'})
        return attrs
        return value

    def validate_nombre(self, value):
        if value not in self.ALLOWED_NOMBRES:
            raise serializers.ValidationError(f"Nombre inválido. Opciones permitidas: {', '.join(self.ALLOWED_NOMBRES)}")
        return value

    def _generate_numero_serie(self, nombre):
        """Genera un número de serie único con formato PREFIX-YYYY-XXXX"""
        year = timezone.now().year
        prefix = Instrumento.PREFIXES.get(nombre)
        if not prefix:
            # fallback
            prefix = nombre[:2].upper()

        base = f"{prefix}-{year}-"

        # Obtener último correlativo
        ultimo = Instrumento.objects.filter(numero_serie__startswith=base).order_by('-fecha_registro').first()
        if not ultimo or not ultimo.numero_serie:
            next_num = 1
        else:
            try:
                last_suffix = ultimo.numero_serie.split('-')[-1]
                next_num = int(last_suffix) + 1
            except Exception:
                next_num = 1

        return f"{base}{str(next_num).zfill(4)}"

    def create(self, validated_data):
        """Crea un instrumento rellenando campos obligatorios en backend."""
        nombre = validated_data.get('nombre')
        numero_serie = validated_data.get('numero_serie')

        # Seguridad: forzamos valores por negocio
        marca = 'UNEFA'
        estado = 'Disponible'
        tipo = 'Metales' if nombre == 'Trompeta' else 'Percusión'

        # Resolución de ruta 3D basada en nombre
        temp = Instrumento()
        temp.nombre = nombre
        modelo_3d_url = temp.resolve_modelo_3d_url() or f"/static/assets/models/{nombre.strip().lower().replace(' ', '-')}.glb"

        if numero_serie:
            return Instrumento.objects.create(
                nombre=nombre,
                marca=marca,
                estado=estado,
                tipo=tipo,
                modelo=nombre,
                modelo_3d_url=modelo_3d_url,
                numero_serie=numero_serie,
                activo=True,
            )

        # Generar numero_serie de forma atómica cuando no fue proporcionado
        try:
            with transaction.atomic():
                numero_serie = self._generate_numero_serie(nombre)
                instrumento = Instrumento.objects.create(
                    nombre=nombre,
                    marca=marca,
                    estado=estado,
                    tipo=tipo,
                    modelo=nombre,
                    modelo_3d_url=modelo_3d_url,
                    numero_serie=numero_serie,
                    activo=True,
                )
                return instrumento
        except IntegrityError:
            # Intentar una generación adicional por si hubiera race condition
            numero_serie = self._generate_numero_serie(nombre)
            instrumento = Instrumento.objects.create(
                nombre=nombre,
                marca=marca,
                estado=estado,
                tipo=tipo,
                modelo=nombre,
                modelo_3d_url=modelo_3d_url,
                numero_serie=numero_serie,
                activo=True,
            )
            return instrumento