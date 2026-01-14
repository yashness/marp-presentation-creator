from pathlib import Path
from app.schemas.theme import ThemeResponse
from app.core.constants import get_builtin_theme_names, get_theme_description

THEMES_DIR = Path(__file__).parent.parent.parent / "themes"

def load_theme_css(theme_name: str) -> str:
    theme_file = THEMES_DIR / f"{theme_name}.css"
    if not theme_file.exists():
        raise FileNotFoundError(f"Theme {theme_name} not found")
    return theme_file.read_text()

def create_theme_response(theme_name: str, css_content: str, description: str) -> ThemeResponse:
    return ThemeResponse(
        id=theme_name, name=theme_name.capitalize(), description=description,
        css_content=css_content, is_builtin=True
    )

def get_builtin_theme(theme_name: str) -> ThemeResponse:
    css_content = load_theme_css(theme_name)
    description = get_theme_description(theme_name)
    return create_theme_response(theme_name, css_content, description)

def list_builtin_themes() -> list[ThemeResponse]:
    theme_names = get_builtin_theme_names()
    return [get_builtin_theme(name) for name in theme_names]
