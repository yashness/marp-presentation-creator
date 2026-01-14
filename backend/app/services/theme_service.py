from pathlib import Path
from app.schemas.theme import ThemeResponse

THEMES_DIR = Path(__file__).parent.parent.parent / "themes"

def load_theme_css(theme_name: str) -> str:
    theme_file = THEMES_DIR / f"{theme_name}.css"
    if not theme_file.exists():
        raise FileNotFoundError(f"Theme {theme_name} not found")
    return theme_file.read_text()

def get_theme_descriptions() -> dict[str, str]:
    return {
        "default": "Clean and minimal design",
        "corporate": "Professional business style with gradient",
        "academic": "Scholarly presentation format"
    }

def create_theme_response(theme_name: str, css_content: str, description: str) -> ThemeResponse:
    return ThemeResponse(
        id=theme_name, name=theme_name.capitalize(), description=description,
        css_content=css_content, is_builtin=True
    )

def get_builtin_theme(theme_name: str) -> ThemeResponse:
    css_content = load_theme_css(theme_name)
    descriptions = get_theme_descriptions()
    return create_theme_response(theme_name, css_content, descriptions.get(theme_name, ""))

def list_builtin_themes() -> list[ThemeResponse]:
    theme_names = ["default", "corporate", "academic"]
    return [get_builtin_theme(name) for name in theme_names]
