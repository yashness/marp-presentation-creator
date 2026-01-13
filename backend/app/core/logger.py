from loguru import logger as _logger
import sys
from pathlib import Path
from typing import Any

def setup_logger() -> Any:
    log_dir = Path(__file__).parent.parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)

    _logger.remove()
    _logger.add(
        sys.stderr,
        level="INFO",
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>"
    )
    _logger.add(
        log_dir / "app.log",
        rotation="500 MB",
        retention="10 days",
        level="DEBUG",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
    )
    return _logger

logger = setup_logger()

__all__ = ["logger"]
