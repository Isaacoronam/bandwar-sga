from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_visorinteraccion'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='password_hash'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='password'
                ) THEN
                    ALTER TABLE core_usuario RENAME COLUMN password_hash TO password;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='password'
                ) THEN
                    ALTER TABLE core_usuario
                    ADD COLUMN password varchar(128) NOT NULL DEFAULT '';
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='last_login'
                ) THEN
                    ALTER TABLE core_usuario
                    ADD COLUMN last_login timestamp with time zone NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='is_superuser'
                ) THEN
                    ALTER TABLE core_usuario
                    ADD COLUMN is_superuser boolean NOT NULL DEFAULT FALSE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='is_staff'
                ) THEN
                    ALTER TABLE core_usuario
                    ADD COLUMN is_staff boolean NOT NULL DEFAULT FALSE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='is_active'
                ) THEN
                    ALTER TABLE core_usuario
                    ADD COLUMN is_active boolean NOT NULL DEFAULT TRUE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='date_joined'
                ) THEN
                    ALTER TABLE core_usuario
                    ADD COLUMN date_joined timestamp with time zone NOT NULL DEFAULT NOW();
                END IF;
            END $$;
            """,
            reverse_sql="""
            DO $$
            BEGIN
                -- Revert only the added fields if needed (keeping password_hash if it existed before)
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='date_joined'
                ) THEN
                    ALTER TABLE core_usuario DROP COLUMN date_joined;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='is_active'
                ) THEN
                    ALTER TABLE core_usuario DROP COLUMN is_active;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='is_staff'
                ) THEN
                    ALTER TABLE core_usuario DROP COLUMN is_staff;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='is_superuser'
                ) THEN
                    ALTER TABLE core_usuario DROP COLUMN is_superuser;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='last_login'
                ) THEN
                    ALTER TABLE core_usuario DROP COLUMN last_login;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='core_usuario' AND column_name='password' AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='core_usuario' AND column_name='password_hash'
                    )
                ) THEN
                    ALTER TABLE core_usuario DROP COLUMN password;
                END IF;
            END $$;
            """,
        ),
    ]
