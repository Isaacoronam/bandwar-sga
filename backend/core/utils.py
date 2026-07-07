"""Utilidades compartidas para logging y procesamiento defensivo de datos."""

from datetime import datetime


def build_structured_log(level: str, message: str, *, timestamp: str | None = None) -> str:
    """Construye un mensaje de log con el formato exigido por la cátedra.

    Formato generado:
        [ERROR] [YYYY-MM-DD]: Mensaje
    """
    level_name = (level or "INFO").upper()
    current_timestamp = timestamp or datetime.now().strftime("%Y-%m-%d")
    return f"[{level_name}] [{current_timestamp}]: {message}"
