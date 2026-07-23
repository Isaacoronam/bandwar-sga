import logging
import uuid
from threading import local
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('django.request')
_thread_local = local()


class CorrelationIdMiddleware(MiddlewareMixin):
    """Attaches and propagates a correlation id for each request."""

    def process_request(self, request):
        correlation_id = request.META.get('HTTP_X_CORRELATION_ID') or str(uuid.uuid4())
        request.correlation_id = correlation_id
        setattr(_thread_local, 'correlation_id', correlation_id)
        request.META['HTTP_X_CORRELATION_ID'] = correlation_id

    def process_response(self, request, response):
        response['X-Correlation-ID'] = getattr(request, 'correlation_id', 'n/a')
        return response

    def process_exception(self, request, exception):
        correlation_id = getattr(request, 'correlation_id', 'n/a')
        logger.exception(
            'Unhandled exception in request',
            extra={'correlation_id': correlation_id, 'request_path': request.path},
        )
        return JsonResponse(
            {
                'error': 'Ocurrió un error seguro en el servidor. El incidente ha sido registrado.',
                'correlation_id': correlation_id,
            },
            status=500,
        )
