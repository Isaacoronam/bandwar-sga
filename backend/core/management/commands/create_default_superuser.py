import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create a default superuser for deployments if one does not exist"

    def add_arguments(self, parser):
        parser.add_argument('--cedula', default=os.getenv('DJANGO_SUPERUSER_CEDULA', 'admin'))
        parser.add_argument('--password', default=os.getenv('DJANGO_SUPERUSER_PASSWORD', 'Admin123!'))
        parser.add_argument('--email', default=os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com'))
        parser.add_argument('--nombre', default=os.getenv('DJANGO_SUPERUSER_NOMBRE', 'Admin'))
        parser.add_argument('--apellido', default=os.getenv('DJANGO_SUPERUSER_APELLIDO', 'User'))

    def handle(self, *args, **options):
        User = get_user_model()
        cedula = options['cedula']
        password = options['password']
        email = options['email']
        nombre = options['nombre']
        apellido = options['apellido']

        if User.objects.filter(cedula=cedula).exists():
            self.stdout.write(self.style.WARNING(f"Superuser with cedula '{cedula}' already exists."))
            return

        user = User.objects.create_superuser(cedula, password)
        user.email = email
        user.nombre = nombre
        user.apellido = apellido
        user.is_active = True
        user.is_staff = True
        user.save()

        self.stdout.write(self.style.SUCCESS(f"Created superuser '{cedula}'"))
