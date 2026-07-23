# Runbook de Operación y Recuperación - BandWar

## Fase #1 - Diagnóstico

### 1. Verificar el estado del servicio en Railway
```bash
railway status
railway logs --tail=200
```

### 2. Verificar salud del backend
```bash
curl -fsS https://<railway-backend-domain>/api/health/
```

## Fase #2 - Protocolo ante caídas

| Nivel | Responsabilidad | Acciones clave |
| --- | --- | --- |
| L1 | Monitoreo e identificación rápida | Revisar el estado del servicio, recuperar el X-Correlation-ID reportado por usuarios y buscarlo en los logs. |
| L2 | Análisis de logs JSON y aislamiento | Revisar los registros estructurados en Railway Logs, filtrar por correlation_id y aislar si el problema es DB, almacenamiento o aplicación. |
| L3 | Ingeniería de software / DevOps | Aplicar parches, restaurar migraciones o variables de entorno, escalar recursos y reimplementar. |

## Fase #3 - Recuperación ante desastres

### 1. Respaldos 3-2-1
- Mantener 3 copias de los datos.
- Guardar en 2 medios diferentes.
- Tener 1 copia fuera del sitio.

### 2. Restauración de la base de datos PostgreSQL desde Railway
```bash
export PGHOST="$PGHOST"
export PGUSER="$PGUSER"
export PGPASSWORD="$PGPASSWORD"
export PGDATABASE="$PGDATABASE"
export PGPORT="${PGPORT:-5432}"

pg_dump --format=custom --no-owner --no-privileges -f backup.dump "$PGDATABASE"
psql "$PGDATABASE" -f backup.dump
```

### 3. Restauración completa desde cero
```bash
railway up --detach
```
