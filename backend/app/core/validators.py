"""Input validation utilities."""

def is_safe_filename(filename: str) -> bool:
    """Check if filename is safe (no path traversal)."""
    dangerous = ["/", "\\", "..", "\0"]
    return not any(char in filename for char in dangerous)

def validate_export_format(format: str) -> bool:
    """Validate export format is allowed."""
    valid = ["pdf", "html", "pptx"]
    return format in valid

def sanitize_filename(filename: str) -> str:
    """Remove unsafe characters from filename."""
    unsafe_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0']
    for char in unsafe_chars:
        filename = filename.replace(char, '_')
    return filename
