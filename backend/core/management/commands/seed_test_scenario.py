"""
Django Management Command: seed_test_scenario

Crea un escenario de prueba completo para validar el flujo E2E:
- instructor_gregorio (PROFESOR)
- alumno_isaac (ESTUDIANTE) con instrumento_asignado tambor_mayor
- examen de prueba con dos preguntas y opciones
- instrumento de prueba Tambor Mayor

Uso:
    python manage.py seed_test_scenario
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from core.models import Usuario, Instrumento, Examen, Pregunta, Opcion


class Command(BaseCommand):
    help = 'Crea un escenario de prueba completo para el prototipo Bandwar SGA'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🌱 Iniciando seed de prueba...'))

        password = 'Bandwar2026!'

        instructor_user, created = User.objects.get_or_create(
            username='instructor_gregorio',
            defaults={
                'email': 'gregorio@example.com',
                'first_name': 'Gregorio',
                'last_name': 'Pérez',
            },
        )
        if created:
            instructor_user.set_password(password)
            instructor_user.save()
            self.stdout.write(self.style.SUCCESS('✅ Django User instructor_gregorio creado'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ Django User instructor_gregorio ya existe'))

        instructor, created = Usuario.objects.get_or_create(
            cedula='V-10000001',
            defaults={
                'nombre': 'Gregorio',
                'apellido': 'Pérez',
                'email': 'gregorio@example.com',
                'rol': 'PROFESOR',
                'activo': True,
            },
        )
        if created:
            instructor.set_password(password)
            instructor.save()
            self.stdout.write(self.style.SUCCESS('✅ Usuario PROFFESOR instructor_gregorio creado'))
        else:
            instructor.nombre = 'Gregorio'
            instructor.apellido = 'Pérez'
            instructor.email = 'gregorio@example.com'
            instructor.rol = 'PROFESOR'
            instructor.activo = True
            instructor.set_password(password)
            instructor.save()
            self.stdout.write(self.style.WARNING('🔄 Usuario PROFFESOR instructor_gregorio actualizado'))

        alumno_user, created = User.objects.get_or_create(
            username='alumno_isaac',
            defaults={
                'email': 'isaac@example.com',
                'first_name': 'Isaac',
                'last_name': 'Núñez',
            },
        )
        if created:
            alumno_user.set_password(password)
            alumno_user.save()
            self.stdout.write(self.style.SUCCESS('✅ Django User alumno_isaac creado'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ Django User alumno_isaac ya existe'))

        alumno, created = Usuario.objects.get_or_create(
            cedula='V-10000002',
            defaults={
                'nombre': 'Isaac',
                'apellido': 'Núñez',
                'email': 'isaac@example.com',
                'rol': 'ESTUDIANTE',
                'activo': True,
                'instrumento_asignado': 'tambor_mayor',
                'instructor_encargado': instructor,
            },
        )
        if created:
            alumno.set_password(password)
            alumno.save()
            self.stdout.write(self.style.SUCCESS('✅ Usuario ESTUDIANTE alumno_isaac creado'))
        else:
            alumno.nombre = 'Isaac'
            alumno.apellido = 'Núñez'
            alumno.email = 'isaac@example.com'
            alumno.rol = 'ESTUDIANTE'
            alumno.activo = True
            alumno.instrumento_asignado = 'tambor_mayor'
            alumno.instructor_encargado = instructor
            alumno.set_password(password)
            alumno.save()
            self.stdout.write(self.style.WARNING('🔄 Usuario ESTUDIANTE alumno_isaac actualizado'))

        instrumento, created = Instrumento.objects.get_or_create(
            numero_serie='TM-2026-0001',
            defaults={
                'nombre': 'Tambor Mayor',
                'tipo': 'Percusión',
                'marca': 'UNEFA',
                'modelo': 'TM-01',
                'estado': 'Disponible',
                'usuario': alumno,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS('✅ Instrumento Tambor Mayor creado'))
        else:
            instrumento.nombre = 'Tambor Mayor'
            instrumento.tipo = 'Percusión'
            instrumento.marca = 'UNEFA'
            instrumento.modelo = 'TM-01'
            instrumento.estado = 'Disponible'
            instrumento.usuario = alumno
            instrumento.save()
            self.stdout.write(self.style.WARNING('🔄 Instrumento Tambor Mayor actualizado'))

        examen, created = Examen.objects.get_or_create(
            titulo='Examen de banda de guerra - Tambor Mayor',
            defaults={
                'descripcion': 'Evaluación de conocimientos básicos sobre el instrumento Tambor Mayor y formación militar.',
                'instrucciones': 'Contesta las preguntas con atención y respeta el límite de tiempo.',
                'fecha_publicacion': timezone.now(),
                'fecha_limite': timezone.now() + timedelta(days=7),
                'duracion_minutos': 20,
                'intentos_permitidos': 1,
                'activo': True,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS('✅ Examen de prueba creado'))
        else:
            examen.descripcion = 'Evaluación de conocimientos básicos sobre el instrumento Tambor Mayor y formación militar.'
            examen.instrucciones = 'Contesta las preguntas con atención y respeta el límite de tiempo.'
            examen.fecha_publicacion = timezone.now()
            examen.fecha_limite = timezone.now() + timedelta(days=7)
            examen.duracion_minutos = 20
            examen.intentos_permitidos = 1
            examen.activo = True
            examen.save()
            self.stdout.write(self.style.WARNING('🔄 Examen de prueba actualizado'))

        pregunta1, _ = Pregunta.objects.get_or_create(
            examen=examen,
            orden=1,
            defaults={
                'enunciado': '¿Cuál es la función principal del Tambor Mayor dentro de la banda de guerra?',
                'tipo': 'multiple',
                'puntos': 10,
                'activo': True,
            },
        )
        
        # ✅ Corregido: Se añade 'activo': True a los defaults de Opcion
        Opcion.objects.get_or_create(
            pregunta=pregunta1,
            orden=1,
            defaults={
                'texto_opcion': 'Guiar los cambios de dirección y marcar el compás',
                'es_correcta': True,
                'activo': True,
            },
        )
        Opcion.objects.get_or_create(
            pregunta=pregunta1,
            orden=2,
            defaults={
                'texto_opcion': 'Tocar melodías principales en la banda',
                'es_correcta': False,
                'activo': True,
            },
        )
        Opcion.objects.get_or_create(
            pregunta=pregunta1,
            orden=3,
            defaults={
                'texto_opcion': 'Coordinar el transporte de instrumentos',
                'es_correcta': False,
                'activo': True,
            },
        )

        pregunta2, _ = Pregunta.objects.get_or_create(
            examen=examen,
            orden=2,
            defaults={
                'enunciado': 'Describe brevemente por qué es importante mantener el tambor correctamente afinado.',
                'tipo': 'theory',
                'puntos': 10,
                'activo': True,
            },
        )

        self.stdout.write(self.style.SUCCESS('✅ Preguntas y opciones de prueba creadas / actualizadas'))
        
        # ✅ Corregido: Credenciales consistentes con la variable password inicial
        self.stdout.write(self.style.SUCCESS(
            f"🎉 Seed finalizado con éxito para Bandwar.\n"
            f"=========================================\n"
            f"🔑 Estudiante: alumno_isaac / {password}\n"
            f"🔑 Instructor: instructor_gregorio / {password}\n"
            f"========================================="
        ))