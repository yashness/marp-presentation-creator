from loguru import logger as _logger
import sys
from pathlib import Path
from typing import Any

def get_log_dir() -> Path:
    log_dir = Path(__file__).parent.parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    return log_dir

def get_console_format() -> str:
    return "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>"

def get_file_format() -> str:
    return "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"

def add_console_handler() -> None:
    _logger.add(sys.stderr, level="INFO", format=get_console_format())

def add_file_handler(log_dir: Path) -> None:
    _logger.add(log_dir / "app.log", rotation="500 MB", retention="10 days", level="DEBUG", format=get_file_format())

def setup_logger() -> Any:
    _logger.remove()
    add_console_handler()
    add_file_handler(get_log_dir())
    return _logger

logger = setup_logger()

__all__ = ["logger"]
