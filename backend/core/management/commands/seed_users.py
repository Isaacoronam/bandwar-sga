"""
Django Management Command: seed_users

Crea automáticamente usuarios de prueba para el desarrollo:
- profe_prueba (PROFESOR)
- estudiante_prueba (ESTUDIANTE)

Ambos con contraseña: bandwar2026

Uso:
    python manage.py seed_users
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import Usuario
from datetime import datetime


class Command(BaseCommand):
    help = 'Crea usuarios de prueba (profesor y estudiante) para desarrollo'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🌱 Iniciando seed de usuarios...'))

        # Datos de los usuarios a crear
        usuarios_data = [
            {
                'username': 'profe_prueba',
                'email': 'profesor@example.com',
                'password': 'bandwar2026',
                'first_name': 'Juan',
                'last_name': 'Profesor',
                'cedula': '1111111111',
                'rol': 'PROFESOR',
            },
            {
                'username': 'estudiante_prueba',
                'email': 'estudiante@example.com',
                'password': 'bandwar2026',
                'first_name': 'Carlos',
                'last_name': 'Estudiante',
                'cedula': '2222222222',
                'rol': 'ESTUDIANTE',
            },
        ]

        for user_data in usuarios_data:
            try:
                # Extraer datos separados
                username = user_data['username']
                email = user_data['email']
                password = user_data['password']
                first_name = user_data['first_name']
                last_name = user_data['last_name']
                cedula = user_data['cedula']
                rol = user_data['rol']

                # Crear Django User
                django_user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        'email': email,
                        'first_name': first_name,
                        'last_name': last_name,
                    },
                )

                if created:
                    django_user.set_password(password)
                    django_user.save()
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Django User "{username}" creado')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'⚠️  Django User "{username}" ya existe')
                    )

                # Crear Usuario personalizado
                usuario, created = Usuario.objects.get_or_create(
                    cedula=cedula,
                    defaults={
                        'nombre': first_name,
                        'apellido': last_name,
                        'email': email,
                        'rol': rol,
                        'activo': True,
                    },
                )

                if created:
                    usuario.set_password(password)
                    usuario.save()
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Usuario "{username}" ({rol}) creado')
                    )
                else:
                    # Actualizar si existe
                    usuario.nombre = first_name
                    usuario.apellido = last_name
                    usuario.email = email
                    usuario.rol = rol
                    usuario.activo = True
                    usuario.set_password(password)
                    usuario.save()
                    self.stdout.write(
                        self.style.WARNING(f'🔄 Usuario "{username}" actualizado')
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error creando usuario "{username}": {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                '\n🎉 ¡Seed completado!\n'
                '📝 Credenciales de prueba:\n'
                '   PROFESOR: profe_prueba / bandwar2026\n'
                '   ESTUDIANTE: estudiante_prueba / bandwar2026\n'
            )
        )
