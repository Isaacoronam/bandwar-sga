import logging
import threading


_thread_local = threading.local()


class CorrelationIdFilter(logging.Filter):
    """Injects a correlation id from the current request thread into log records."""

    def filter(self, record):
        correlation_id = getattr(_thread_local, 'correlation_id', None)
        if not correlation_id:
            correlation_id = 'n/a'
        record.correlation_id = correlation_id
        return True
