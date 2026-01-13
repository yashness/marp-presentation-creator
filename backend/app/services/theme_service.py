from pathlib import Path
from app.schemas.theme import ThemeResponse

THEMES_DIR = Path(__file__).parent.parent.parent / "themes"

def load_theme_css(theme_name: str) -> str:
    theme_file = THEMES_DIR / f"{theme_name}.css"
    if not theme_file.exists():
        raise FileNotFoundError(f"Theme {theme_name} not found")
    return theme_file.read_text()

def get_builtin_theme(theme_name: str) -> ThemeResponse:
    css_content = load_theme_css(theme_name)
    descriptions = {
        "default": "Clean and minimal design",
        "corporate": "Professional business style with gradient",
        "academic": "Scholarly presentation format"
    }
    return ThemeResponse(
        id=theme_name,
        name=theme_name.capitalize(),
        description=descriptions.get(theme_name, ""),
        css_content=css_content,
        is_builtin=True
    )

def list_builtin_themes() -> list[ThemeResponse]:
    theme_names = ["default", "corporate", "academic"]
    return [get_builtin_theme(name) for name in theme_names]
