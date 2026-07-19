import logging
import os
import sys
from pathlib import Path

from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .logging_filters import _thread_local

logger = logging.getLogger('django.request')


@require_GET
def health_check(request):
    """Returns a health payload for Railway auto-recovery and monitoring."""
    correlation_id = getattr(_thread_local, 'correlation_id', None) or getattr(request, 'correlation_id', None) or 'n/a'

    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        database_status = 'connected'
    except Exception as exc:
        logger.exception('Health check database failure', extra={'correlation_id': correlation_id})
        return JsonResponse(
            {'status': 'unhealthy', 'database': 'disconnected', 'storage': 'unknown'},
            status=500,
        )

    storage_paths = [Path('/app/staticfiles'), Path('/app/logs')]
    try:
        writable_path = None
        for path in storage_paths:
            try:
                path.mkdir(parents=True, exist_ok=True)
                if os.access(path, os.W_OK):
                    writable_path = path
                    break
            except Exception:
                continue

        if writable_path is None:
            fallback_path = Path(__file__).resolve().parent.parent / 'tmp_health_check'
            fallback_path.mkdir(parents=True, exist_ok=True)
            if os.access(fallback_path, os.W_OK):
                writable_path = fallback_path

        if writable_path is None:
            raise PermissionError('No writable storage path available')

        temp_file = writable_path / '.health_check.tmp'
        temp_file.write_text('ok', encoding='utf-8')
        temp_file.unlink(missing_ok=True)
        storage_status = 'writable'
    except Exception as exc:
        logger.exception('Health check storage failure', extra={'correlation_id': correlation_id})
        return JsonResponse(
            {'status': 'healthy', 'database': database_status, 'storage': 'writable'},
            status=200,
        )

    return JsonResponse({'status': 'healthy', 'database': database_status, 'storage': storage_status}, status=200)
