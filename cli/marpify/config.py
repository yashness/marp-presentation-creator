"""Configuration for Marpify CLI."""

from pathlib import Path

API_BASE_URL = "http://localhost:8000/api"
DEFAULT_THEME = "default"
AVAILABLE_THEMES = ["default", "corporate", "academic"]
EXPORT_FORMATS = ["pdf", "html", "pptx"]
DEFAULT_PORT = 5173
TEMPLATE_DIR = Path(__file__).parent / "templates"
