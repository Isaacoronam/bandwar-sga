FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system django \
    && useradd --system --gid django --home /app --shell /usr/sbin/nologin django

COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir -r /tmp/requirements.txt

COPY . /app/

RUN mkdir -p /app/staticfiles /app/logs /app/media \
    && chown -R django:django /app \
    && chmod -R 755 /app/staticfiles /app/logs /app/media \
    && find /app -type f -exec chmod 644 {} +

USER django

EXPOSE 8000

CMD ["sh", "-c", "python /app/manage.py collectstatic --noinput && python /app/manage.py migrate --noinput && python /app/manage.py create_default_superuser --cedula 00000000 --password Admin123! && gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --log-level info"]
