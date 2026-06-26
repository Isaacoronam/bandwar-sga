"""
Management Command: Asignar instructores a estudiantes sin instructor_encargado
===

Propósito: Reparar datos históricos donde estudiantes fueron registrados antes
          de la asignación automática del instructor_encargado.

Uso:
    python manage.py assign_instructors_to_students [--profesor-id=X] [--instructor-cedula=XXXX] [--dry-run]

Ejemplos:
    # Asignar al primer profesor disponible (en orden de ID)
    python manage.py assign_instructors_to_students

    # Asignar a un profesor específico por ID
    python manage.py assign_instructors_to_students --profesor-id=1

    # Asignar por cédula del profesor
    python manage.py assign_instructors_to_students --instructor-cedula=11111111

    # Simulación sin guardar
    python manage.py assign_instructors_to_students --dry-run
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from core.models import Usuario
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Asigna instructores a estudiantes históricos sin instructor_encargado'

    def add_arguments(self, parser):
        parser.add_argument(
            '--profesor-id',
            type=int,
            help='ID del profesor a asignar como instructor'
        )
        parser.add_argument(
            '--instructor-cedula',
            type=str,
            help='Cédula del profesor a asignar como instructor'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simular la operación sin guardar cambios'
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        profesor_id = options.get('profesor_id')
        instructor_cedula = options.get('instructor_cedula')

        self.stdout.write(self.style.WARNING("=" * 70))
        self.stdout.write(self.style.WARNING("ASIGNACIÓN DE INSTRUCTORES A ESTUDIANTES"))
        self.stdout.write(self.style.WARNING("=" * 70))

        if dry_run:
            self.stdout.write(self.style.SUCCESS("🔍 MODO: DRY-RUN (sin guardar)"))
        else:
            self.stdout.write(self.style.SUCCESS("✏️  MODO: GUARDAR CAMBIOS"))

        # 1️⃣ BUSCAR ESTUDIANTES SIN INSTRUCTOR
        estudiantes_sin_instructor = Usuario.objects.filter(
            rol='ESTUDIANTE',
            instructor_encargado__isnull=True
        ).order_by('cedula')

        self.stdout.write(f"\n📊 Estudiantes sin instructor: {estudiantes_sin_instructor.count()}")

        if estudiantes_sin_instructor.count() == 0:
            self.stdout.write(self.style.SUCCESS("✅ No hay estudiantes sin instructor. ¡Todo correcto!"))
            return

        # 2️⃣ BUSCAR PROFESOR A ASIGNAR
        profesor = None

        if instructor_cedula:
            try:
                profesor = Usuario.objects.get(
                    cedula=instructor_cedula,
                    rol='PROFESOR'
                )
                self.stdout.write(
                    f"✅ Profesor encontrado por cédula: {profesor.nombre} {profesor.apellido} (ID: {profesor.id})"
                )
            except Usuario.DoesNotExist:
                raise CommandError(
                    f"❌ No existe profesor con cédula {instructor_cedula}"
                )

        elif profesor_id:
            try:
                profesor = Usuario.objects.get(
                    id=profesor_id,
                    rol='PROFESOR'
                )
                self.stdout.write(
                    f"✅ Profesor encontrado por ID: {profesor.nombre} {profesor.apellido} (Cédula: {profesor.cedula})"
                )
            except Usuario.DoesNotExist:
                raise CommandError(
                    f"❌ No existe profesor con ID {profesor_id}"
                )

        else:
            # Tomar el primer profesor disponible
            profesores = Usuario.objects.filter(rol='PROFESOR').order_by('id')
            if not profesores.exists():
                raise CommandError("❌ No hay profesores registrados en el sistema")
            profesor = profesores.first()
            self.stdout.write(
                f"ℹ️  Se usará profesor por defecto: {profesor.nombre} {profesor.apellido} (ID: {profesor.id})"
            )

        # 3️⃣ VALIDAR QUE EL PROFESOR SEA VÁLIDO
        if not profesor or profesor.rol != 'PROFESOR':
            raise CommandError("❌ Usuario seleccionado no es un profesor válido")

        # 4️⃣ ASIGNAR INSTRUCTOR A TODOS LOS ESTUDIANTES
        self.stdout.write(f"\n📝 Asignando instructor a {estudiantes_sin_instructor.count()} estudiantes...")
        self.stdout.write(f"   Instructor: {profesor.nombre} {profesor.apellido} (Cédula: {profesor.cedula})")

        if not dry_run:
            try:
                with transaction.atomic():
                    contador = 0
                    for estudiante in estudiantes_sin_instructor:
                        estudiante.instructor_encargado = profesor
                        estudiante.save(update_fields=['instructor_encargado'])
                        contador += 1
                        self.stdout.write(
                            f"   ✅ {contador}. {estudiante.nombre} {estudiante.apellido} (Cédula: {estudiante.cedula})"
                        )

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"\n✅ ÉXITO: Se asignó instructor a {contador} estudiantes"
                        )
                    )
                    logger.info(
                        f"[INFO] Asignación de instructores completada: {contador} estudiantes "
                        f"→ {profesor.nombre} {profesor.apellido}"
                    )

            except Exception as e:
                logger.error(f"[ERROR] Fallo en transacción de asignación: {str(e)}")
                raise CommandError(f"❌ Error al guardar cambios: {str(e)}")

        else:
            # Dry-run: solo mostrar qué se haría
            contador = 0
            for estudiante in estudiantes_sin_instructor:
                contador += 1
                self.stdout.write(
                    f"   [SIMUL] {contador}. {estudiante.nombre} {estudiante.apellido} (Cédula: {estudiante.cedula})"
                )

            self.stdout.write(
                self.style.WARNING(
                    f"\n⚠️  DRY-RUN: Se asignaría instructor a {contador} estudiantes "
                    f"(sin guardar)"
                )
            )

        # 5️⃣ VERIFICACIÓN FINAL
        self.stdout.write("\n📊 ESTADO FINAL:")
        total_estudiantes = Usuario.objects.filter(rol='ESTUDIANTE').count()
        con_instructor = Usuario.objects.filter(
            rol='ESTUDIANTE',
            instructor_encargado__isnull=False
        ).count()
        sin_instructor_final = total_estudiantes - con_instructor

        self.stdout.write(f"   Total estudiantes: {total_estudiantes}")
        self.stdout.write(self.style.SUCCESS(f"   Con instructor: {con_instructor}"))
        if sin_instructor_final > 0:
            self.stdout.write(self.style.WARNING(f"   Sin instructor: {sin_instructor_final}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"   Sin instructor: {sin_instructor_final} ✅"))

        self.stdout.write(self.style.WARNING("=" * 70))
