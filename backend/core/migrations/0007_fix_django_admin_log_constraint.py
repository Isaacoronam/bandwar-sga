from django.db import migrations


def fix_admin_log_user_id(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            ALTER TABLE django_admin_log
            DROP CONSTRAINT IF EXISTS django_admin_log_user_id_c564eba6_fk_auth_user_id;
            UPDATE django_admin_log
            SET user_id = core_usuario.id
            FROM auth_user, core_usuario
            WHERE django_admin_log.user_id = auth_user.id
              AND core_usuario.email = auth_user.email;
            ALTER TABLE django_admin_log
            ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_core_usuario_id
                FOREIGN KEY (user_id)
                REFERENCES core_usuario(id)
                DEFERRABLE INITIALLY DEFERRED;
            """
        )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_usuario_groups_usuario_user_permissions_and_more'),
    ]

    operations = [
        migrations.RunPython(fix_admin_log_user_id, migrations.RunPython.noop),
    ]
