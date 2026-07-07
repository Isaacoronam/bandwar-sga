from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_visorinteraccion'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE core_usuario ADD COLUMN IF NOT EXISTS password varchar(128) NOT NULL DEFAULT '';
            ALTER TABLE core_usuario ADD COLUMN IF NOT EXISTS last_login timestamp with time zone NULL;
            ALTER TABLE core_usuario ADD COLUMN IF NOT EXISTS is_superuser boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE core_usuario ADD COLUMN IF NOT EXISTS is_staff boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE core_usuario ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT TRUE;
            ALTER TABLE core_usuario ADD COLUMN IF NOT EXISTS date_joined timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
            """,
            reverse_sql="""
            ALTER TABLE core_usuario DROP COLUMN IF EXISTS date_joined;
            ALTER TABLE core_usuario DROP COLUMN IF EXISTS is_active;
            ALTER TABLE core_usuario DROP COLUMN IF EXISTS is_staff;
            ALTER TABLE core_usuario DROP COLUMN IF EXISTS is_superuser;
            ALTER TABLE core_usuario DROP COLUMN IF EXISTS last_login;
            ALTER TABLE core_usuario DROP COLUMN IF EXISTS password;
            """,
        ),
    ]
