"""Input validation utilities."""

from app.core.constants import get_valid_formats

def is_safe_filename(filename: str) -> bool:
    """Check if filename is safe (no path traversal)."""
    dangerous = ["/", "\\", "..", "\0"]
    return not any(char in filename for char in dangerous)

def validate_export_format(format: str) -> bool:
    """Validate export format is allowed."""
    return format in get_valid_formats()

def sanitize_filename(filename: str) -> str:
    """Remove unsafe characters from filename using whitelist approach."""
    import string
    allowed_chars = string.ascii_letters + string.digits + '-_. '
    sanitized = ''.join(c if c in allowed_chars else '_' for c in filename)
    return sanitized.strip() or "untitled"
