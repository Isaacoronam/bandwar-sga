from rest_framework.routers import DefaultRouter
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    InstrumentoViewSet, 
    CustomTokenObtainPairView, 
    VisorInteraccionViewSet,
    AlumnosListView,
    AsignarInstrumentoView,
    RegistrarAlumnoView,
    editar_estudiante,
    eliminar_estudiante,
    ExamenProfesorViewSet,
    ExamenEstudianteViewSet,
    PreguntaViewSet,
    OpcionViewSet,
    ProfesorPerfilView,
    CambiarContraseñaView,
    PerfilUsuarioView,
    NotaEstudianteViewSet,
    ResponderExamenView,
)

router = DefaultRouter()
router.register(r'instrumentos', InstrumentoViewSet, basename='instrumento')
router.register(r'visor/interacciones', VisorInteraccionViewSet, basename='visor-interaccion')
router.register(r'profesor/examenes', ExamenProfesorViewSet, basename='profesor-examen')
router.register(r'estudiante/examenes', ExamenEstudianteViewSet, basename='estudiante-examen')
router.register(r'estudiante/notas', NotaEstudianteViewSet, basename='estudiante-nota')
router.register(r'preguntas', PreguntaViewSet, basename='pregunta')
router.register(r'opciones', OpcionViewSet, basename='opcion')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/profesor/alumnos/', AlumnosListView.as_view(), name='alumnos-list'),
    path('api/profesor/asignar-instrumento/', AsignarInstrumentoView.as_view(), name='asignar-instrumento'),
    path('api/profesor/registrar-alumno/', RegistrarAlumnoView.as_view(), name='registrar-alumno'),
    path('api/profesor/perfil/', ProfesorPerfilView.as_view(), name='profesor-perfil'),
    path('api/profesor/cambiar-contraseña/', CambiarContraseñaView.as_view(), name='cambiar-contraseña'),
    path('api/usuario/perfil/', PerfilUsuarioView.as_view(), name='usuario-perfil'),
    path('api/profesor/editar-alumno/<int:pk>/', editar_estudiante, name='editar_estudiante'),
    path('api/profesor/eliminar-alumno/<int:pk>/', eliminar_estudiante, name='eliminar_estudiante'),
    path('api/examenes/<int:pk>/responder/', ResponderExamenView.as_view(), name='responder-examen'),
]
