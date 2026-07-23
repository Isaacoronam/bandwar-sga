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

COPY . /tmp/build-context

RUN if [ -f /tmp/build-context/requirements.txt ]; then \
        cp /tmp/build-context/requirements.txt /tmp/requirements.txt; \
    elif [ -f /tmp/build-context/backend/requirements.txt ]; then \
        cp /tmp/build-context/backend/requirements.txt /tmp/requirements.txt; \
    else \
        echo "requirements.txt not found in build context" >&2; \
        exit 1; \
    fi \
    && if [ -d /tmp/build-context/backend ]; then \
        cp -r /tmp/build-context/backend/. /app/; \
    else \
        cp -r /tmp/build-context/. /app/; \
    fi \
    && rm -rf /tmp/build-context \
    && python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir -r /tmp/requirements.txt

RUN mkdir -p /app/staticfiles /app/logs /app/media \
    && chown -R django:django /app \
    && chmod -R 755 /app/staticfiles /app/logs /app/media \
    && find /app -type f -exec chmod 644 {} +

USER django

EXPOSE 8000

CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py migrate --noinput && python manage.py create_default_superuser --cedula 00000000 --password Admin123! && gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --log-level info"]