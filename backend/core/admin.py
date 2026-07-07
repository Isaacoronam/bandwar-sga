from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Usuario, Grupo, Permiso, UsuarioGrupo, GrupoPermiso,
    Instrumento, Examen, Pregunta, Opcion,
    IntentoExamen, RespuestaEstudiante
)

class UsuarioAdmin(UserAdmin):
    model = Usuario
    ordering = ('cedula',)
    list_display = ('cedula', 'nombre', 'apellido', 'email', 'rol', 'is_staff', 'is_active')
    list_filter = ('rol', 'is_staff', 'is_active')
    search_fields = ('cedula', 'email', 'nombre', 'apellido')
    readonly_fields = ('last_login', 'date_joined')
    fieldsets = (
        (None, {'fields': ('cedula', 'password')}),
        ('Información personal', {'fields': ('nombre', 'apellido', 'email')}),
        ('Permisos', {'fields': ('rol', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fechas', {'fields': ('last_login', 'date_joined')}),
        ('Banda', {'fields': ('instrumento_asignado', 'instructor_encargado')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('cedula', 'nombre', 'apellido', 'email', 'rol', 'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )

@admin.register(Instrumento)
class InstrumentoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'estado', 'usuario', 'activo')
    list_filter = ('estado', 'tipo', 'activo')
    search_fields = ('nombre', 'numero_serie')
    readonly_fields = ('modelo_3d_url',)

# Registramos los otros modelos que no usan decoradores
admin.site.register(Usuario, UsuarioAdmin)
admin.site.register(Grupo)
admin.site.register(Permiso)
admin.site.register(UsuarioGrupo)
admin.site.register(GrupoPermiso)
# admin.site.register(Instrumento, InstrumentoAdmin) <--- ELIMINADA ESTA LÍNEA
admin.site.register(Examen)
admin.site.register(Pregunta)
admin.site.register(Opcion)
admin.site.register(IntentoExamen)
admin.site.register(RespuestaEstudiante)