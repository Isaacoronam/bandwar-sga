"""
Tests para el módulo core de Bandwar.

Estructura de tests:
- tests/test_auth.py: Pruebas de autenticación y login
- tests/test_models.py: Pruebas de modelos
- tests/test_views.py: Pruebas de endpoints de API
- tests/test_serializers.py: Pruebas de serializadores

Para ejecutar:
	python manage.py test
    
O con pytest:
	pytest backend/core/tests/
"""

from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import datetime
import json

from core.models import Usuario, Instrumento, VisorInteraccion
from core.serializers import AsignarInstrumentoSerializer, RegistroAlumnoSerializer
from core.utils import build_structured_log
from django.contrib.auth import get_user_model
User = get_user_model()


# ============================================================================
# TEST CASOS - AUTENTICACIÓN Y LOGIN
# ============================================================================

class UsuarioLoginTestCase(APITestCase):
    """
    Pruebas para el endpoint de login.
    """

    def setUp(self):
        self.usuario_test = Usuario.objects.create_user(
            cedula="V-12345678",
            password="password123",
            nombre="Juan",
            apellido="Pérez",
            email="juan@example.com",
            rol="ESTUDIANTE",
            activo=True,
        )
        self.login_url = reverse("token_obtain_pair")

    def test_login_exitoso(self):
        payload = {
            "cedula": "V-12345678",
            "password": "password123",
        }

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("usuario", response.data)
        self.assertEqual(response.data["usuario"]["cedula"], "V-12345678")
        self.assertEqual(response.data["usuario"]["rol"], "ESTUDIANTE")

    def test_login_sin_credenciales(self):
        payload = {}

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_login_contraseña_incorrecta(self):
        payload = {
            "cedula": "V-12345678",
            "password": "wrongpassword",
        }

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access", response.data)


class ProfesorRegistrarAlumnoTestCase(APITestCase):
    """Pruebas para el endpoint de registro cerrado de alumnos."""

    def setUp(self):
        self.profesor = Usuario.objects.create_user(
            cedula="V-00000001",
            password="profesor123",
            nombre="Profe",
            apellido="Test",
            email="profe@test.com",
            rol="PROFESOR",
            activo=True,
            is_staff=True,
        )
        self.login_url = reverse("token_obtain_pair")
        self.registro_url = reverse("registrar-alumno")

    def authenticate_profesor(self):
        response = self.client.post(
            self.login_url,
            data=json.dumps({"cedula": "V-00000001", "password": "profesor123"}),
            content_type="application/json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_registrar_alumno_exitoso(self):
        self.authenticate_profesor()
        payload = {
            "cedula": "V-33333333",
            "nombre": "Alumno",
            "apellido": "Prueba",
            "email": "alumno@prueba.com",
            "password": "estudiante123",
            "carrera": "Ingeniería",
            "semestre": 1,
        }

        response = self.client.post(
            self.registro_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["cedula"], "V-33333333")
        self.assertEqual(response.data["rol"], "ESTUDIANTE")

    def test_registrar_alumno_sin_permiso(self):
        alumno = Usuario.objects.create_user(
            cedula="V-44444444",
            password="alumno123",
            nombre="Alumno",
            apellido="SinPermiso",
            email="alumno2@prueba.com",
            rol="ESTUDIANTE",
            activo=True,
        )
        self.client.force_authenticate(user=alumno)

        payload = {
            "cedula": "V-55555555",
            "nombre": "Alumno",
            "apellido": "Prohibido",
            "email": "alumno3@prueba.com",
            "password": "estudiante123",
        }

        response = self.client.post(
            self.registro_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ============================================================================
# TEST CASOS - MODELOS
# ============================================================================

class UsuarioModelTestCase(TestCase):
    def test_crear_usuario_valido(self):
        usuario = Usuario.objects.create_user(
            cedula="V-87654321",
            password="hash_seguro",
            nombre="María",
            apellido="González",
            email="maria@example.com",
            rol="PROFESOR",
        )

        self.assertEqual(Usuario.objects.count(), 1)
        self.assertEqual(usuario.nombre, "María")
        self.assertEqual(usuario.rol, "PROFESOR")
        self.assertIn("María", str(usuario))

    def test_cedula_unica(self):
        Usuario.objects.create_user(
            cedula="V-11111111",
            password="hash1",
            nombre="User1",
            apellido="One",
            email="user1@example.com",
        )

        with self.assertRaises(Exception):
            Usuario.objects.create_user(
                cedula="V-11111111",
                password="hash2",
                nombre="User2",
                apellido="Two",
                email="user2@example.com",
            )

    def test_email_unico(self):
        Usuario.objects.create_user(
            cedula="V-22222222",
            password="hash3",
            nombre="User3",
            apellido="Three",
            email="duplicate@example.com",
        )

        with self.assertRaises(Exception):
            Usuario.objects.create_user(
                cedula="V-33333333",
                password="hash4",
                nombre="User4",
                apellido="Four",
                email="duplicate@example.com",
            )


# ============================================================================
# TEST CASOS - ENDPOINTS DE API
# ============================================================================

class InstrumentoAPITestCase(APITestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            cedula="V-99999999",
            password="hash",
            nombre="Prof",
            apellido="Test",
            email="prof@example.com",
            rol="PROFESOR",
        )

        self.instrumento1 = Instrumento.objects.create(
            nombre="Trompeta 1",
            tipo="Viento Metal",
            marca="Yamaha",
            modelo="YTR-2330",
            numero_serie="A12345",
            estado="Disponible",
            usuario=self.usuario,
        )

        self.instrumento2 = Instrumento.objects.create(
            nombre="Clarinete 1",
            tipo="Viento Madera",
            marca="Buffet",
            modelo="B12",
            numero_serie="B67890",
            estado="En Reparación",
            usuario=None,
        )

    def test_listar_instrumentos(self):
        response = self.client.get(reverse("instrumento-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # La respuesta puede venir paginada (dict con 'results') o como lista directa.
        if isinstance(response.data, dict):
            count = len(response.data.get("results", []))
        else:
            count = len(response.data)
        self.assertEqual(count, 2)

    def test_filtrar_por_estado(self):
        response = self.client.get(
            reverse("instrumento-list"),
            {"estado": "Disponible"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if isinstance(response.data, dict):
            items = response.data.get("results", [])
        else:
            items = response.data
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["nombre"], "Trompeta 1")

    def test_endpoint_disponibles(self):
        response = self.client.get(reverse("instrumento-disponibles"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if isinstance(response.data, dict):
            count = len(response.data.get("results", []))
        else:
            count = len(response.data)
        self.assertGreater(count, 0)


# ============================================================================
# TEST CASOS - VISOR INTERACCIÓN
# ============================================================================

class VisorInteraccionTestCase(APITestCase):
    def setUp(self):
        self.estudiante = Usuario.objects.create_user(
            cedula="V-55555555",
            password="hash",
            nombre="Carlos",
            apellido="López",
            email="carlos@example.com",
            rol="ESTUDIANTE",
        )

        self.instrumento = Instrumento.objects.create(
            nombre="Violín 1",
            tipo="Cuerda",
            marca="Stradivarius",
            modelo="Vintage",
            numero_serie="VLN001",
            estado="Disponible",
        )

    def test_registrar_interaccion_sin_auth(self):
        payload = {
            "instrumento": self.instrumento.id,
            "tiempo_visualizacion_segundos": 120,
            "puntos_calientes_visitados": [1, 2, 3],
            "rotaciones_realizadas": 5,
            "zooms_realizados": 3,
        }

        response = self.client.post(
            reverse("visor-interaccion-list"),
            data=payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_registrar_interaccion_con_auth(self):
        # Placeholder: requiere implementación de autenticación en tests
        pass

class HealthCheckTestCase(APITestCase):
    def test_health_endpoint_returns_healthy(self):
        response = self.client.get(reverse("health-check"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"status": "healthy"})


class CoreBusinessLogicTestCase(TestCase):
    def test_asignar_instrumento_serializer_asigna_instrumento_disponible(self):
        estudiante = Usuario.objects.create_user(
            cedula="V-10000001",
            password="password123",
            nombre="Ana",
            apellido="García",
            email="ana@example.com",
            rol="ESTUDIANTE",
        )
        instrumento = Instrumento.objects.create(
            nombre="Bombo",
            tipo="Percusión",
            marca="Yamaha",
            modelo="YB-100",
            numero_serie=None,
            estado="Disponible",
        )

        serializer = AsignarInstrumentoSerializer(
            data={"estudiante_id": estudiante.id, "instrumento_id": instrumento.id}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        result = serializer.save()

        self.assertEqual(result["estudiante"].id, estudiante.id)
        self.assertEqual(result["instrumento"].usuario_id, estudiante.id)
        estudiante.refresh_from_db(fields=['instrumento_asignado'])
        self.assertEqual(estudiante.instrumento_asignado, "Bombo")
        self.assertEqual(result["instrumento"].estado, "Asignado")

    def test_asignar_instrumento_serializer_rechaza_instrumento_asignado(self):
        estudiante = Usuario.objects.create_user(
            cedula="V-10000002",
            password="password123",
            nombre="Luis",
            apellido="Pérez",
            email="luis@example.com",
            rol="ESTUDIANTE",
        )
        otro_estudiante = Usuario.objects.create_user(
            cedula="V-10000003",
            password="password123",
            nombre="Marta",
            apellido="López",
            email="marta@example.com",
            rol="ESTUDIANTE",
        )
        instrumento = Instrumento.objects.create(
            nombre="Trompeta",
            tipo="Viento",
            marca="Yamaha",
            modelo="TR-200",
            numero_serie="TR-001",
            estado="Disponible",
            usuario=otro_estudiante,
        )

        serializer = AsignarInstrumentoSerializer(
            data={"estudiante_id": estudiante.id, "instrumento_id": instrumento.id}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("instrumento_id", serializer.errors)

    def test_asignar_instrumento_serializer_rechaza_instrumento_no_disponible(self):
        estudiante = Usuario.objects.create_user(
            cedula="V-10000004",
            password="password123",
            nombre="Sofía",
            apellido="Ruiz",
            email="sofia@example.com",
            rol="ESTUDIANTE",
        )
        instrumento = Instrumento.objects.create(
            nombre="Redoblante",
            tipo="Percusión",
            marca="Meinl",
            modelo="RD-100",
            numero_serie="RD-001",
            estado="En reparación",
        )

        serializer = AsignarInstrumentoSerializer(
            data={"estudiante_id": estudiante.id, "instrumento_id": instrumento.id}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("instrumento_id", serializer.errors)

    def test_instrumento_save_autogenera_numero_serie_y_modelo_3d(self):
        instrumento = Instrumento.objects.create(
            nombre="Tambor Mayor",
            tipo="Percusión",
            marca="Pearl",
            modelo="TM-300",
            numero_serie="",
            estado="Disponible",
        )

        self.assertTrue(instrumento.numero_serie.startswith("TM-"))
        self.assertEqual(instrumento.resolve_modelo_3d_url(), "/assets/models/tambor-mayor.glb")

    def test_registro_alumno_serializer_crea_usuario_con_password_default(self):
        serializer = RegistroAlumnoSerializer(
            data={
                "cedula": "V-10000005",
                "nombre": "Carlos",
                "apellido": "Mendoza",
                "email": "carlos@example.com",
                "carrera": "Educación Musical",
                "semestre": 3,
                "rango_militar": "Soldado",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        usuario = serializer.save()

        self.assertTrue(usuario.check_password(RegistroAlumnoSerializer.DEFAULT_PASSWORD))
        self.assertEqual(usuario.rol, "ESTUDIANTE")
        self.assertTrue(usuario.activo)


class LoggingUtilitiesTestCase(TestCase):
    def test_build_structured_log_uses_required_format(self):
        log_line = build_structured_log("ERROR", "Error de asignación de instrumento")

        self.assertIn("[ERROR]", log_line)
        self.assertRegex(log_line, r"\[ERROR\] \[\d{4}-\d{2}-\d{2}\]: Error de asignación de instrumento")

# ============================================================================
# SUITE DE PRUEBAS - READY FOR EXECUTION
# ============================================================================
"""
INSTRUCCIONES PARA EJECUTAR TESTS:

1. Ejecutar todos los tests:
   python manage.py test core

2. Ejecutar archivo específico:
   python manage.py test core.tests.UsuarioLoginTestCase

3. Ejecutar test específico:
   python manage.py test core.tests.UsuarioLoginTestCase.test_login_exitoso
"""
