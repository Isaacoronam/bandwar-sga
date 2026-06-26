from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_normalize_instrumento_names'),
    ]

    operations = [
        migrations.AddField(
            model_name='instrumento',
            name='ultimo_responsable',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='instrumentos_reportados', to='core.usuario'),
        ),
        migrations.AddField(
            model_name='instrumento',
            name='motivo_tecnico',
            field=models.TextField(blank=True, default='', help_text='Motivo técnico del último cambio de estado'),
        ),
    ]
