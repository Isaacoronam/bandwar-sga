import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()
from core.models import Usuario
cedula='admin'
password='Admin123!'
email='admin@example.com'
if Usuario.objects.filter(cedula=cedula).exists():
    print('EXISTS')
else:
    u = Usuario.objects.create_superuser(cedula, password)
    u.email = email
    u.nombre = 'Admin'
    u.apellido = 'User'
    u.save()
    print('CREATED')
