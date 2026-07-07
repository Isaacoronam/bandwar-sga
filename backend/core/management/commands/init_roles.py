from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from core.models import Grupo, Permiso, UsuarioGrupo, GrupoPermiso, Usuario


class Command(BaseCommand):
    help = 'Inicializa los grupos y permisos de Django y crea la tabla de permisos personalizada para Bandwar.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔧 Inicializando roles y permisos de Bandwar...'))

        # Definición de grupos Django
        grupos = {
            'Profesores': 'Grupo de profesores con permisos de gestión completa de la plataforma.',
            'Estudiantes': 'Grupo de estudiantes con acceso a exámenes y visor 3D.',
        }

        # Definición de permisos personalizados en el modelo de dominio
        permisos_personalizados = [
            {'nombre': 'add_usuario', 'descripcion': 'Crear usuarios nuevos', 'modulo': 'Usuario', 'accion': 'add', 'grupos': ['Profesores']},
            {'nombre': 'view_usuario', 'descripcion': 'Ver usuarios registrados', 'modulo': 'Usuario', 'accion': 'view', 'grupos': ['Profesores']},
            {'nombre': 'view_examen_propio', 'descripcion': 'Ver exámenes disponibles para el estudiante', 'modulo': 'Examen', 'accion': 'view_examen_propio', 'grupos': ['Estudiantes']},
            {'nombre': 'add_examen', 'descripcion': 'Crear exámenes', 'modulo': 'Examen', 'accion': 'add', 'grupos': ['Profesores']},
            {'nombre': 'change_examen', 'descripcion': 'Editar exámenes', 'modulo': 'Examen', 'accion': 'change', 'grupos': ['Profesores']},
            {'nombre': 'view_examen', 'descripcion': 'Ver exámenes', 'modulo': 'Examen', 'accion': 'view', 'grupos': ['Profesores', 'Estudiantes']},
            {'nombre': 'add_pregunta', 'descripcion': 'Crear preguntas de examen', 'modulo': 'Pregunta', 'accion': 'add', 'grupos': ['Profesores']},
            {'nombre': 'change_pregunta', 'descripcion': 'Editar preguntas', 'modulo': 'Pregunta', 'accion': 'change', 'grupos': ['Profesores']},
            {'nombre': 'view_pregunta', 'descripcion': 'Ver preguntas', 'modulo': 'Pregunta', 'accion': 'view', 'grupos': ['Profesores']},
            {'nombre': 'add_opcion', 'descripcion': 'Crear opciones de pregunta', 'modulo': 'Opcion', 'accion': 'add', 'grupos': ['Profesores']},
            {'nombre': 'change_opcion', 'descripcion': 'Editar opciones', 'modulo': 'Opcion', 'accion': 'change', 'grupos': ['Profesores']},
            {'nombre': 'view_opcion', 'descripcion': 'Ver opciones', 'modulo': 'Opcion', 'accion': 'view', 'grupos': ['Profesores']},
            {'nombre': 'add_visorinteraccion', 'descripcion': 'Registrar interacciones del visor 3D', 'modulo': 'VisorInteraccion', 'accion': 'add', 'grupos': ['Estudiantes']},
            {'nombre': 'view_visorinteraccion', 'descripcion': 'Ver historial de interacciones del visor 3D', 'modulo': 'VisorInteraccion', 'accion': 'view', 'grupos': ['Estudiantes', 'Profesores']},
        ]

        auth_groups = {}
        for nombre, descripcion in grupos.items():
            group, created = Group.objects.get_or_create(name=nombre)
            auth_groups[nombre] = group
            if created:
                self.stdout.write(self.style.SUCCESS(f'✅ Grupo Django "{nombre}" creado'))
            else:
                self.stdout.write(self.style.WARNING(f'🔄 Grupo Django "{nombre}" ya existe'))

        # Crea o actualiza los grupos de dominio y sus permisos personalizados
        dominio_grupos = {}
        for nombre, descripcion in grupos.items():
            grupo, created = Grupo.objects.get_or_create(
                nombre=nombre,
                defaults={'descripcion': descripcion},
            )
            dominio_grupos[nombre] = grupo
            if created:
                self.stdout.write(self.style.SUCCESS(f'✅ Grupo de dominio "{nombre}" creado'))
            else:
                grupo.descripcion = descripcion
                grupo.activo = True
                grupo.save()
                self.stdout.write(self.style.WARNING(f'🔄 Grupo de dominio "{nombre}" actualizado'))

        for permiso_def in permisos_personalizados:
            permiso, created = Permiso.objects.get_or_create(
                nombre=permiso_def['nombre'],
                defaults={
                    'descripcion': permiso_def['descripcion'],
                    'modulo': permiso_def['modulo'],
                    'accion': permiso_def['accion'],
                    'activo': True,
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✅ Permiso de dominio "{permiso.nombre}" creado'))
            else:
                permiso.descripcion = permiso_def['descripcion']
                permiso.modulo = permiso_def['modulo']
                permiso.accion = permiso_def['accion']
                permiso.activo = True
                permiso.save()
                self.stdout.write(self.style.WARNING(f'🔄 Permiso de dominio "{permiso.nombre}" actualizado'))

            for nombre_grupo in permiso_def['grupos']:
                grupo = dominio_grupos[nombre_grupo]
                GrupoPermiso.objects.get_or_create(
                    grupo=grupo,
                    permiso=permiso,
                    defaults={'fecha_asignacion': timezone.now()},
                )

        # Asignar permisos de Django a los grupos correspondientes
        for permiso_def in permisos_personalizados:
            codename = permiso_def['accion']
            modulo = permiso_def['modulo'].lower()
            if codename in ['view_examen_propio']:
                continue
            try:
                content_type = ContentType.objects.get(app_label='core', model=modulo)
                permission = Permission.objects.get(content_type=content_type, codename=f'{codename}_{modulo}')
                for nombre_grupo in permiso_def['grupos']:
                    auth_groups[nombre_grupo].permissions.add(permission)
            except Permission.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f'⚠️ Permiso Django no encontrado: {codename}_{modulo}'
                ))
            except ContentType.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f'⚠️ ContentType no encontrado para modelo core.{modulo}'
                ))

        # Asignar usuarios existentes a grupos Django y de dominio según su rol
        for usuario in Usuario.objects.all():
            grupo_nombre = 'Profesores' if usuario.rol == 'PROFESOR' else 'Estudiantes'
            auth_group = auth_groups.get(grupo_nombre)
            grupo = dominio_grupos.get(grupo_nombre)
            if auth_group:
                usuario.groups.add(auth_group)
            if grupo:
                UsuarioGrupo.objects.get_or_create(
                    usuario=usuario,
                    grupo=grupo,
                    defaults={'fecha_asignacion': timezone.now()},
                )

        self.stdout.write(self.style.SUCCESS('🎉 Inicialización de roles y permisos completada.'))
