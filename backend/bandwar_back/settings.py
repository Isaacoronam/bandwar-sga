import sys
from pathlib import Path

from pythonjsonlogger.jsonlogger import JsonFormatter

from .logging_filters import CorrelationIdFilter


class StructuredJsonFormatter(JsonFormatter):
    """Formats logging records as JSON with the required operational fields."""

    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        log_record['timestamp'] = log_record.get('asctime')
        log_record['levelname'] = log_record.get('levelname')
        log_record['name'] = log_record.get('name')
        log_record['message'] = log_record.get('message')
        log_record['correlation_id'] = getattr(record, 'correlation_id', None)
        log_record['pathname'] = record.pathname
        log_record['lineno'] = record.lineno


def build_logging_config(logs_dir: Path):
    """Builds the production logging configuration for Django."""
    logs_dir.mkdir(parents=True, exist_ok=True)
    return {
        'version': 1,
        'disable_existing_loggers': False,
        'filters': {
            'correlation_id_filter': {
                '()': CorrelationIdFilter,
            },
        },
        'formatters': {
            'json': {
                '()': 'bandwar_back.settings.StructuredJsonFormatter',
                'json_ensure_ascii': False,
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'stream': sys.stdout,
                'formatter': 'json',
                'filters': ['correlation_id_filter'],
            },
            'file_rotative': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(logs_dir / 'bandwar_production.log'),
                'maxBytes': 10 * 1024 * 1024,
                'backupCount': 5,
                'formatter': 'json',
                'filters': ['correlation_id_filter'],
            },
        },
        'loggers': {
            'django': {
                'handlers': ['console', 'file_rotative'],
                'level': 'INFO',
                'propagate': False,
            },
            'django.request': {
                'handlers': ['console', 'file_rotative'],
                'level': 'INFO',
                'propagate': False,
            },
        },
    }
