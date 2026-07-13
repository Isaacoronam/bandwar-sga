from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

User = get_user_model()


class CreateDefaultSuperuserCommandTests(TestCase):
    def test_create_default_superuser_creates_superuser_from_options(self):
        call_command(
            "create_default_superuser",
            cedula="admin",
            password="Admin123!",
            email="admin@example.com",
            nombre="Admin",
            apellido="User",
            verbosity=0,
        )

        user = User.objects.get(cedula="admin")
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.check_password("Admin123!"))
