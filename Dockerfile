# 1. Use a lightweight official Python base image
FROM python:3.11-slim

# 2. Set Python runtime environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# 3. Install system dependencies needed to build PostgreSQL and Python packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        python3-dev \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# 4. Create a dedicated non-root user for security
RUN groupadd --system django \
    && useradd --system --gid django --home /app --shell /usr/sbin/nologin django

# 5. Set working directory inside the container
WORKDIR /app

# 6. Copy and install dependency requirements first for better cache usage
COPY backend/requirements.txt /app/
RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir -r requirements.txt

# 7. Copy the Django project source code
COPY backend/ /app/

# 8. Ensure the app directory and staticfiles folder are writable by the django user
RUN mkdir -p /app/staticfiles && chown -R django:django /app && chmod -R 777 /app/staticfiles

# 9. Use the non-root django user for runtime
USER django

# 9. Expose the port expected by Back4App
EXPOSE 8000

# 10. Run static collection, database migrations and start Gunicorn
CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py migrate --noinput && gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --log-level info"]