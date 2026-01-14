from app.core.validators import is_safe_filename, validate_export_format, sanitize_filename

def test_is_safe_filename_valid():
    assert is_safe_filename("presentation.md") is True
    assert is_safe_filename("my-slide-deck") is True

def test_is_safe_filename_invalid():
    assert is_safe_filename("../etc/passwd") is False
    assert is_safe_filename("foo/bar") is False
    assert is_safe_filename("foo\\bar") is False

def test_validate_export_format_valid():
    assert validate_export_format("pdf") is True
    assert validate_export_format("html") is True
    assert validate_export_format("pptx") is True

def test_validate_export_format_invalid():
    assert validate_export_format("exe") is False
    assert validate_export_format("docx") is False

def test_sanitize_filename():
    assert sanitize_filename("foo/bar") == "foo_bar"
    assert sanitize_filename("foo\\bar") == "foo_bar"
    assert sanitize_filename("foo:bar*baz") == "foo_bar_baz"

def test_sanitize_filename_whitelist():
    """Test whitelist approach keeps only safe chars."""
    assert sanitize_filename("test<>file") == "test__file"
    assert sanitize_filename("my file.txt") == "my file.txt"
    assert sanitize_filename("file@#$.md") == "file___.md"

def test_sanitize_filename_empty():
    """Test empty filename returns default."""
    assert sanitize_filename("") == "untitled"
    assert sanitize_filename("   ") == "untitled"
