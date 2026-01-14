"""Tests for CLI configuration."""

from marpify.config import (
    API_BASE_URL,
    DEFAULT_THEME,
    AVAILABLE_THEMES,
    EXPORT_FORMATS,
    DEFAULT_PORT
)


def test_api_base_url():
    """Test API base URL is configured."""
    assert API_BASE_URL == "http://localhost:8000/api"


def test_default_theme():
    """Test default theme is set."""
    assert DEFAULT_THEME == "default"


def test_available_themes():
    """Test available themes list."""
    assert len(AVAILABLE_THEMES) == 3
    assert "default" in AVAILABLE_THEMES
    assert "corporate" in AVAILABLE_THEMES
    assert "academic" in AVAILABLE_THEMES


def test_export_formats():
    """Test export formats list."""
    assert len(EXPORT_FORMATS) == 3
    assert "pdf" in EXPORT_FORMATS
    assert "html" in EXPORT_FORMATS
    assert "pptx" in EXPORT_FORMATS


def test_default_port():
    """Test default port is configured."""
    assert DEFAULT_PORT == 5173
