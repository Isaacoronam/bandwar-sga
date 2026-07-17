FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev python3-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY . /tmp/build-context

RUN if [ -f /tmp/build-context/requirements.txt ]; then \
        cp /tmp/build-context/requirements.txt /app/requirements.txt; \
    else \
        cp /tmp/build-context/backend/requirements.txt /app/requirements.txt; \
    fi \
    && if [ -d /tmp/build-context/backend ]; then \
        cp -r /tmp/build-context/backend/. /app/; \
    else \
        cp -r /tmp/build-context/. /app/; \
    fi \
    && rm -rf /tmp/build-context

RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir -r /app/requirements.txt

RUN mkdir -p /app/staticfiles

EXPOSE 8000

CMD ["sh", "-c", "python /app/manage.py collectstatic --noinput && python /app/manage.py migrate --noinput && gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --log-level info"]
