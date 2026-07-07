from django.db import migrations


def normalize_name(value: str) -> str:
    if not value:
        return ''
    key = value.strip().lower().replace('_', ' ').replace('-', ' ')
    for a, b in [('á', 'a'), ('é', 'e'), ('í', 'i'), ('ó', 'o'), ('ú', 'u')]:
        key = key.replace(a, b)
    return ' '.join(key.split())


def forwards(apps, schema_editor):
    Instrumento = apps.get_model('core', 'Instrumento')
    Usuario = apps.get_model('core', 'Usuario')

    mapping = {
        'bombo': 'Bombo',
        'platillos': 'Platillos',
        'lira': 'Lira',
        'redoblante': 'Redoblante',
        'granaderos': 'Granaderos',
        'tambor mayor': 'Tambor Mayor',
        'tambor mayor': 'Tambor Mayor',
        'trompeta': 'Trompeta',
    }

    # Normalize Instrumento.nombre
    for instr in Instrumento.objects.all():
        norm = normalize_name(instr.nombre)
        if norm in mapping:
            new = mapping[norm]
            if instr.nombre != new:
                instr.nombre = new
                instr.save(update_fields=['nombre'])

    # Normalize Usuario.instrumento_asignado (si aplica)
    for usuario in Usuario.objects.all():
        ia = usuario.instrumento_asignado
        if not ia:
            continue
        norm = normalize_name(ia)
        if norm in mapping:
            new = mapping[norm]
            if usuario.instrumento_asignado != new:
                usuario.instrumento_asignado = new
                usuario.save(update_fields=['instrumento_asignado'])


def reverse(apps, schema_editor):
    # No reversible: mantenemos los nombres normalizados
    return


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_remove_instrumento_archivo_3d'),
    ]

    operations = [
        migrations.RunPython(forwards, reverse_code=reverse),
    ]
