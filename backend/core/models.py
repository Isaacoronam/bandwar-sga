from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.exceptions import ValidationError
from django.utils.html import strip_tags
from decimal import Decimal
import datetime

from django.db import models
from django.conf import settings
from django.utils import timezone

# Instrumentos oficiales (snake_case keys)
INSTRUMENT_CHOICES = [
    ('Bombo', 'Bombo'),
    ('Platillos', 'Platillos'),
    ('Lira', 'Lira'),
    ('Redoblante', 'Redoblante'),
    ('Granaderos', 'Granaderos'),
    ('Tambor Mayor', 'Tambor Mayor'),
    ('Trompeta', 'Trompeta'),
]


class UsuarioManager(BaseUserManager):
    """Manager para el modelo Usuario que autentica por cédula."""

    def create_user(self, cedula, password=None, **extra_fields):
        if not cedula:
            raise ValueError('La cédula es obligatoria para crear un usuario')

        cedula = self.model.normalize_username(cedula)
        # Extraer email de extra_fields para evitar pasarla dos veces
        email = extra_fields.pop('email', None)
        # Si no se proporciona email, usar un valor por defecto para cumplir
        # la restricción NOT NULL de la columna en la base de datos.
        if not email:
            email = f"{cedula}@no-reply.local"
        usuario = self.model(
            cedula=cedula,
            email=self.normalize_email(email),
            **extra_fields,
        )
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, cedula, password, **extra_fields):
        extra_fields.setdefault('rol', 'PROFESOR')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True')

        return self.create_user(cedula, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    """Modelo de usuario personalizado para autenticación por cédula."""

    ROLES = [
        ('PROFESOR', 'Profesor'),
        ('ESTUDIANTE', 'Estudiante'),
    ]

    cedula = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    rol = models.CharField(max_length=20, choices=ROLES, default='ESTUDIANTE')
    carrera = models.CharField(max_length=150, blank=True, default='')
    semestre = models.PositiveSmallIntegerField(null=True, blank=True)
    rango_militar = models.CharField(max_length=100, blank=True, default='')
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    instrumento_asignado = models.CharField(max_length=50, choices=INSTRUMENT_CHOICES, null=True, blank=True)
    instructor_encargado = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='estudiantes'
    )

    objects = UsuarioManager()

    USERNAME_FIELD = 'cedula'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['email', 'nombre', 'apellido']

    class Meta:
        verbose_name = 'Usuario'

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.cedula}) - {self.get_rol_display()}"

    def get_full_name(self):
        return f"{self.nombre} {self.apellido}".strip()

    def get_short_name(self):
        return self.nombre or self.cedula

    def belongs_to_group(self, nombre_grupo):
        return self.rol == nombre_grupo.upper() or self.usuario_grupos.filter(grupo__nombre__iexact=nombre_grupo).exists()

    def assign_to_group(self, grupo):
        if not self.usuario_grupos.filter(grupo=grupo).exists():
            UsuarioGrupo.objects.create(
                usuario=self,
                grupo=grupo,
                fecha_asignacion=timezone.now(),
            )


class Grupo(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField()
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Grupo"


class Permiso(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField()
    modulo = models.CharField(max_length=100)
    accion = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Permiso"


class UsuarioGrupo(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="usuario_grupos"
    )
    grupo = models.ForeignKey(
        Grupo,
        on_delete=models.CASCADE,
        related_name="grupo_usuarios"
    )
    fecha_asignacion = models.DateTimeField()

    def __str__(self):
        return f"{self.usuario} -> {self.grupo}"

    class Meta:
        verbose_name = "Usuario Grupo"


class GrupoPermiso(models.Model):
    grupo = models.ForeignKey(
        Grupo,
        on_delete=models.CASCADE,
        related_name="grupo_permisos"
    )
    permiso = models.ForeignKey(
        Permiso,
        on_delete=models.CASCADE,
        related_name="permiso_grupos"
    )
    fecha_asignacion = models.DateTimeField()

    def __str__(self):
        return f"{self.grupo} -> {self.permiso}"

    class Meta:
        verbose_name = "Grupo Permiso"


class Instrumento(models.Model):
    """
    Modelo para gestionar instrumentos de la banda de guerra.
    
    Campos:
    - nombre: Nombre del instrumento (Bombo, Trompeta, etc)
    - tipo: Clasificación (Viento, Percusión, etc)
    - marca: Marca del fabricante
    - modelo: Modelo específico
    - numero_serie: Identificador único del instrumento físico
    - estado: Estado operativo (Disponible, Asignado, En reparación, etc)
    - usuario: FK al estudiante que lo tiene asignado (null si está disponible)
    - descripcion: Detalles técnicos del instrumento
    - modelo_3d_url: Ruta al archivo .glb para visualización 3D
    - fecha_registro: Fecha de registro del instrumento en el sistema
    - fecha_actualizacion: Última fecha de actualización
    - activo: Indica si el instrumento está activo en el inventario
    """
    
    TIPO_CHOICES = [
        ('Viento', 'Viento'),
        ('Percusión', 'Percusión'),
        ('Cuerda', 'Cuerda'),
        ('Metales', 'Metales'),
    ]
    
    ESTADO_CHOICES = [
        ('Disponible', 'Disponible'),
        ('Asignado', 'Asignado'),
        ('En reparación', 'En reparación'),
        ('Mantenimiento', 'Mantenimiento'),
        ('En Taller', 'En Taller'),
        ('Dañado', 'Dañado'),
        ('Extraviado', 'Extraviado'),
        ('No operativo', 'No operativo'),
    ]
    
    nombre = models.CharField(max_length=50, choices=INSTRUMENT_CHOICES)
    tipo = models.CharField(max_length=50, choices=TIPO_CHOICES, default='Viento')
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    numero_serie = models.CharField(max_length=100, unique=True, blank=True, null=True)
    estado = models.CharField(max_length=50, choices=ESTADO_CHOICES, default='Disponible')
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="instrumentos"
    )
    ultimo_alumno_asignado = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ultimos_instrumentos"
    )
    ultimo_responsable = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="instrumentos_reportados"
    )
    motivo_tecnico = models.TextField(blank=True, default='', help_text='Motivo técnico del último cambio de estado')
    descripcion = models.TextField(blank=True, default='', help_text='Detalles técnicos del instrumento')
    modelo_3d_url = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Ruta al archivo .glb (ej: /assets/models/tambor.glb)'
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)

    MODELO_3D_PATHS = {
        'bombo': '/assets/models/bombo.glb',
        'tambor mayor': '/assets/models/tambor-mayor.glb',
        'granaderos': '/assets/models/granaderos.glb',
        'platillos': '/assets/models/platillos.glb',
        'redoblante': '/assets/models/redoblante.glb',
        'trompeta': '/assets/models/trompeta.glb',
        'lira': '/assets/models/lira.glb',
    }

    PREFIXES = {
        'Bombo': 'BB',
        'Platillos': 'PL',
        'Lira': 'LR',
        'Redoblante': 'RD',
        'Granaderos': 'GD',
        'Tambor Mayor': 'TM',
        'Trompeta': 'TR',
    }

    @staticmethod
    def normalize_instrumento_key(value):
        if not value:
            return ''
        key = value.strip().lower().replace('_', ' ').replace('-', ' ')
        for original, normalized in [('á', 'a'), ('é', 'e'), ('í', 'i'), ('ó', 'o'), ('ú', 'u')]:
            key = key.replace(original, normalized)
        return ' '.join(key.split())

    def get_modelo_3d_path(self):
        """Obtiene la ruta del modelo 3D asociada al instrumento."""
        return self.modelo_3d_url or None

    def resolve_modelo_3d_url(self):
        nombre_key = self.normalize_instrumento_key(self.nombre)
        return self.MODELO_3D_PATHS.get(nombre_key)

    def save(self, *args, **kwargs):
        """Normaliza el número de serie, lo autogenera si hace falta y asigna el modelo 3D antes de guardar."""
        if self.numero_serie is not None and str(self.numero_serie).strip() == '':
            self.numero_serie = None

        if not self.numero_serie:
            prefijos = {
                'Bombo': 'BB',
                'Platillos': 'PL',
                'Lira': 'LR',
                'Redoblante': 'RD',
                'Granaderos': 'GD',
                'Tambor Mayor': 'TM',
                'Trompeta': 'TR',
            }
            prefijo = prefijos.get(self.nombre, 'XX')
            anio = datetime.date.today().year
            prefijo_anio = f"{prefijo}-{anio}-"

            ultimo_inst = Instrumento.objects.filter(
                numero_serie__startswith=prefijo_anio
            ).order_by('-numero_serie').first()

            if ultimo_inst and ultimo_inst.numero_serie:
                ultimo_correlativo = ultimo_inst.numero_serie.split('-')[-1]
                try:
                    siguiente_numero = int(ultimo_correlativo) + 1
                except ValueError:
                    siguiente_numero = 1
            else:
                siguiente_numero = 1

            correlativo = str(siguiente_numero).zfill(4)
            self.numero_serie = f"{prefijo}-{anio}-{correlativo}"

        modelo_path = self.resolve_modelo_3d_url()
        if modelo_path:
            self.modelo_3d_url = modelo_path
        super().save(*args, **kwargs)

    def __str__(self):
        serial = self.numero_serie or 'S/N'
        return f"{self.nombre} ({serial}) - {self.estado}"

    class Meta:
        verbose_name = "Instrumento"
        ordering = ['-fecha_registro']
        indexes = [
            models.Index(fields=['numero_serie']),
            models.Index(fields=['estado']),
            models.Index(fields=['usuario']),
        ]

    def asignar_a_estudiante(self, estudiante):
        """Asigna el instrumento a un estudiante"""
        if self.estado != 'Disponible':
            raise ValueError(f"El instrumento no está disponible. Estado actual: {self.estado}")
        self.usuario = estudiante
        self.estado = 'Asignado'
        self.save()
    
    def liberar(self):
        """Libera el instrumento (lo deja disponible)."""
        if self.usuario:
            alumno = self.usuario
            self.usuario = None
            alumno.instrumento_asignado = ''
            alumno.save(update_fields=['instrumento_asignado'])
        self.estado = 'Disponible'
        self.save()

    def desasignar(self):
        """Desasigna el instrumento de un estudiante asignado y lo deja disponible."""
        if not self.usuario:
            return
        alumno = self.usuario
        self.usuario = None
        alumno.instrumento_asignado = ''
        alumno.save(update_fields=['instrumento_asignado'])
        self.estado = 'Disponible'
        self.save()

    def reportar_mantenimiento(self, responsable, motivo_tecnico):
        """Marca el instrumento como en taller / mantenimiento, desasigna si está asignado."""
        if self.usuario:
            self.ultimo_alumno_asignado = self.usuario
            alumno = self.usuario
            self.usuario = None
            alumno.instrumento_asignado = ''
            alumno.save(update_fields=['instrumento_asignado'])
        self.estado = 'En Taller'
        self.ultimo_responsable = responsable
        self.motivo_tecnico = motivo_tecnico
        self.save()


class VisorInteraccion(models.Model):
    estudiante = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='interacciones_visor'
    )
    instrumento = models.ForeignKey(
        Instrumento,
        on_delete=models.CASCADE,
        related_name='interacciones_visor'
    )
    tiempo_visualizacion_segundos = models.IntegerField()
    puntos_calientes_visitados = models.JSONField(default=list)
    rotaciones_realizadas = models.IntegerField()
    zooms_realizados = models.IntegerField()
    fecha_interaccion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Interacción {self.estudiante} - {self.instrumento}"

    class Meta:
        verbose_name = "Visor Interacción"


class Examen(models.Model):
    """
    Modelo que representa un examen académico creado por un profesor.

    Campos:
    - profesor: Profesor creador del examen
    - titulo: Nombre del examen
    - descripcion: Descripción del contenido del examen
    - instrucciones: Instrucciones para el estudiante
    - fecha_apertura: Fecha y hora de apertura
    - fecha_cierre: Fecha y hora de cierre
    - duracion_minutos: Tiempo permitido para resolver el examen
    - estado: Estado del examen en el flujo de publicación
    - fecha_creacion: Fecha de creación del registro
    - fecha_actualizacion: Fecha de última actualización
    """

    ESTADO_CHOICES = [
        ('Borrador', 'Borrador'),
        ('Publicado', 'Publicado'),
        ('Cerrado', 'Cerrado'),
    ]

    profesor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='examenes_creados'
    )
    titulo = models.CharField(max_length=150)
    descripcion = models.TextField()
    instrucciones = models.TextField(blank=True, default='')
    fecha_apertura = models.DateTimeField()
    fecha_cierre = models.DateTimeField()
    duracion_minutos = models.IntegerField()
    intentos_permitidos = models.IntegerField(default=1)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='Publicado')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.duracion_minutos <= 0:
            raise ValidationError({'duracion_minutos': 'La duración debe ser mayor a cero.'})
        if self.duracion_minutos > 105:
            raise ValidationError({'duracion_minutos': 'La duración no puede exceder 105 minutos.'})
        if self.intentos_permitidos != 1:
            raise ValidationError({'intentos_permitidos': 'Solo se permite un intento por examen.'})
        if self.fecha_cierre <= self.fecha_apertura:
            raise ValidationError({'fecha_cierre': 'La fecha de cierre debe ser posterior a la fecha de apertura.'})

    def __str__(self):
        return f"{self.titulo} ({self.estado})"

    class Meta:
        verbose_name = "Examen"
        ordering = ['-fecha_apertura', 'titulo']


class Pregunta(models.Model):
    """
    Modelo que representa una pregunta dentro de un examen.

    Campos:
    - examen: Examen al que pertenece la pregunta
    - enunciado: Texto de la pregunta
    - tipo: Tipo de pregunta
    - valor_puntos: Puntos que vale la pregunta
    - orden: Orden de presentación dentro del examen
    """

    TIPO_CHOICES = [
        ('Seleccion Simple', 'Seleccion Simple'),
        ('Verdadero/Falso', 'Verdadero/Falso'),
    ]

    examen = models.ForeignKey(
        Examen,
        on_delete=models.CASCADE,
        related_name='preguntas'
    )
    enunciado = models.TextField()
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    valor_puntos = models.DecimalField(max_digits=4, decimal_places=2)
    orden = models.IntegerField(blank=True, null=True)

    def clean(self):
        self.enunciado = strip_tags(self.enunciado or '').strip()
        if not self.enunciado:
            raise ValidationError({'enunciado': 'El enunciado no puede estar vacío.'})
        if self.valor_puntos <= 0:
            raise ValidationError({'valor_puntos': 'El valor en puntos debe ser mayor a cero.'})
        if self.valor_puntos > Decimal('20.00'):
            raise ValidationError({'valor_puntos': 'El valor en puntos no puede exceder 20.00.'})

    def save(self, *args, **kwargs):
        if not self.orden:
            from django.db.models import Max
            ultimo_orden = Pregunta.objects.filter(examen=self.examen).aggregate(Max('orden'))['orden__max']
            self.orden = (ultimo_orden or 0) + 1
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Pregunta {self.orden} - {self.examen.titulo}"

    class Meta:
        verbose_name = "Pregunta"
        ordering = ['examen', 'orden']


class Opcion(models.Model):
    """
    Modelo que representa una opción de respuesta para una pregunta.

    Campos:
    - pregunta: Pregunta a la que pertenece
    - texto: Texto de la opción
    - es_correcta: Indica si es la opción correcta
    """

    pregunta = models.ForeignKey(
        Pregunta,
        on_delete=models.CASCADE,
        related_name='opciones'
    )
    texto = models.TextField()
    es_correcta = models.BooleanField(default=False)

    def clean(self):
        self.texto = strip_tags(self.texto or '').strip()
        if not self.texto:
            raise ValidationError({'texto': 'El texto de la opción no puede estar vacío.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Opción {self.id} - Pregunta {self.pregunta.orden}"

    class Meta:
        verbose_name = "Opcion"
        ordering = ['pregunta', 'id']


class IntentoExamen(models.Model):
    """
    Modelo que representa un intento de examen realizado por un estudiante.

    Campos:
    - estudiante: Estudiante que realiza el intento
    - examen: Examen que se está intentando
    - fecha_inicio: Fecha y hora de inicio del intento
    - fecha_finalizacion: Fecha y hora en que se entregó o finalizó el intento
    - calificacion_final: Nota final sobre 20.00
    - estado: Estado del intento
    """

    ESTADO_CHOICES = [
        ('En progreso', 'En progreso'),
        ('Entregado', 'Entregado'),
        ('Calificado', 'Calificado'),
    ]

    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='intentos_examen'
    )
    examen = models.ForeignKey(
        Examen,
        on_delete=models.CASCADE,
        related_name='intentos'
    )
    fecha_inicio = models.DateTimeField()
    fecha_finalizacion = models.DateTimeField()
    calificacion_final = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES)

    def __str__(self):
        return f"Intento {self.id} - {self.examen.titulo} - {self.estudiante}"

    class Meta:
        verbose_name = "Intento Examen"
        ordering = ['-fecha_inicio']
        constraints = [
            models.UniqueConstraint(fields=['estudiante', 'examen'], name='unique_intento_por_estudiante_examen')
        ]


class RespuestaEstudiante(models.Model):
    """
    Modelo que representa la respuesta de un estudiante a una pregunta dentro de un intento.

    Campos:
    - intento: Intento de examen correspondiente
    - pregunta: Pregunta respondida
    - opcion_seleccionada: Opción seleccionada por el estudiante
    """

    intento = models.ForeignKey(
        IntentoExamen,
        on_delete=models.CASCADE,
        related_name='respuestas'
    )
    pregunta = models.ForeignKey(
        Pregunta,
        on_delete=models.CASCADE
    )
    opcion_seleccionada = models.ForeignKey(
        Opcion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Respuesta {self.id} - Intento {self.intento.id} - Pregunta {self.pregunta.orden}"

    class Meta:
        verbose_name = "Respuesta Estudiante"
        ordering = ['intento', 'pregunta']
        # ✅ SOLUCIÓN BUG-002: Asegurar que solo haya una respuesta por pregunta por intento
        constraints = [
            models.UniqueConstraint(fields=['intento', 'pregunta'], name='unique_respuesta_por_intento_pregunta')
        ]


class Nota(models.Model):
    """
    Modelo que registra el historial de calificaciones de un estudiante.
    
    Campos:
    - estudiante: Estudiante que obtuvo la calificación
    - examen: Examen evaluado
    - nota_obtenida: Calificación numérica (0-20)
    - estado: Estado de la calificación (Aprobado/Reprobado)
    - fecha_completado: Fecha en que se completó el examen
    - observaciones: Observaciones del profesor sobre el desempeño
    """
    
    ESTADO_CHOICES = [
        ('Aprobado', 'Aprobado'),
        ('Reprobado', 'Reprobado'),
    ]
    
    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notas'
    )
    examen = models.ForeignKey(
        Examen,
        on_delete=models.CASCADE,
        related_name='notas'
    )
    nota_obtenida = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        help_text='Calificación de 0 a 20'
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='Reprobado'
    )
    fecha_completado = models.DateTimeField(auto_now_add=True)
    observaciones = models.TextField(
        blank=True,
        default='',
        help_text='Observaciones del profesor sobre el desempeño'
    )
    
    def clean(self):
        """Valida que la nota esté en rango y actualiza el estado automáticamente."""
        if self.nota_obtenida < 0 or self.nota_obtenida > 20:
            raise ValidationError({'nota_obtenida': 'La nota debe estar entre 0 y 20.'})
        # Nota mínima aprobatoria = 10
        self.estado = 'Aprobado' if self.nota_obtenida >= 10 else 'Reprobado'
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.estudiante} - {self.examen.titulo}: {self.nota_obtenida}/20 ({self.estado})"
    
    class Meta:
        verbose_name = "Nota"
        ordering = ['-fecha_completado']
        unique_together = ['estudiante', 'examen']
        indexes = [
            models.Index(fields=['estudiante', '-fecha_completado']),
            models.Index(fields=['estado']),
        ]
