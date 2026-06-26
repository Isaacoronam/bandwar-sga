# Generated manually to add instrumento_asignado and instructor_encargado
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_usuario_rol'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='instrumento_asignado',
            field=models.CharField(choices=[('bombo', 'Bombo'), ('trompeta', 'Trompeta'), ('granaderos', 'Granaderos'), ('lira', 'Lira'), ('platillos', 'Platillos'), ('redoblante', 'Redoblante'), ('tambor_mayor', 'Tambor Mayor')], max_length=50, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='usuario',
            name='instructor_encargado',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='estudiantes', to='core.usuario'),
        ),
    ]
