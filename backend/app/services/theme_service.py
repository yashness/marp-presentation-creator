"""Theme service for managing built-in and custom themes."""

import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.theme import Theme
from app.schemas.theme import (
    ThemeResponse, ThemeCreate, ThemeUpdate,
    ColorConfig, TypographyConfig, SpacingConfig
)
from app.core.constants import get_builtin_theme_names, get_theme_description
from app.services.css_generator import generate_theme_css

THEMES_DIR = Path(__file__).parent.parent.parent / "themes"

DEFAULT_COLORS = ColorConfig(
    background="#0b1024",
    text="#e2e8f0",
    h1="#0ea5e9",
    h2="#7c3aed",
    h3="#0ea5e9",
    link="#38bdf8",
    code_background="#0f172a",
    code_text="#e2e8f0",
    code_block_background="#111827",
    code_block_text="#e5e7eb",
)

DEFAULT_TYPOGRAPHY = TypographyConfig(
    font_family='Sora, "Helvetica Neue", sans-serif',
    font_size="28px",
    h1_size="52px",
    h1_weight="700",
    h2_size="38px",
    h2_weight="700",
    h3_size="30px",
    h3_weight="600",
    code_font_family='"JetBrains Mono", monospace',
)

DEFAULT_SPACING = SpacingConfig(
    slide_padding="64px",
    h1_margin_bottom="24px",
    h2_margin_top="18px",
    code_padding="2px 10px",
    code_block_padding="18px",
    border_radius="10px",
    code_block_border_radius="12px",
)

def build_theme_config_with_brand_colors(brand_colors: list[str]) -> tuple[ColorConfig, TypographyConfig, SpacingConfig]:
    """Build theme configs using defaults with optional brand color accents."""
    colors = DEFAULT_COLORS.model_copy(deep=True)
    if brand_colors:
        primary = brand_colors[0]
        colors.h1 = primary
        colors.h3 = primary
        colors.link = primary
    if len(brand_colors) > 1:
        colors.h2 = brand_colors[1]
    return colors, DEFAULT_TYPOGRAPHY, DEFAULT_SPACING

def load_builtin_css(theme_name: str) -> str:
    """Load CSS content from file for built-in theme."""
    theme_file = THEMES_DIR / f"{theme_name}.css"
    if not theme_file.exists():
        raise FileNotFoundError(f"Theme {theme_name} not found")
    return theme_file.read_text()

def create_builtin_response(theme_name: str, css: str) -> ThemeResponse:
    """Create response for built-in theme."""
    description = get_theme_description(theme_name)
    return ThemeResponse(
        id=theme_name,
        name=theme_name.capitalize(),
        description=description,
        is_builtin=True,
        css_content=css,
        colors=None,
        typography=None,
        spacing=None
    )

def get_builtin_theme(theme_name: str) -> ThemeResponse:
    """Get built-in theme by name."""
    css_content = load_builtin_css(theme_name)
    return create_builtin_response(theme_name, css_content)

def list_builtin_themes() -> list[ThemeResponse]:
    """List all built-in themes."""
    theme_names = get_builtin_theme_names()
    return [get_builtin_theme(name) for name in theme_names]

def db_theme_to_response(theme: Theme) -> ThemeResponse:
    """Convert database theme to response."""
    css = generate_theme_css(
        theme.id, theme.colors, theme.typography, theme.spacing
    )
    return ThemeResponse(
        id=theme.id,
        name=theme.name,
        description=theme.description,
        is_builtin=theme.is_builtin,
        colors=ColorConfig(**theme.colors),
        typography=TypographyConfig(**theme.typography),
        spacing=SpacingConfig(**theme.spacing),
        css_content=css,
        created_at=theme.created_at,
        updated_at=theme.updated_at
    )

def list_custom_themes(db: Session) -> list[ThemeResponse]:
    """List all custom themes from database."""
    themes = db.query(Theme).filter(Theme.is_builtin == False).all()
    return [db_theme_to_response(theme) for theme in themes]

def list_all_themes(db: Session) -> list[ThemeResponse]:
    """List all themes (built-in + custom)."""
    builtin = list_builtin_themes()
    custom = list_custom_themes(db)
    return builtin + custom

def get_theme_by_id(db: Session, theme_id: str) -> ThemeResponse | None:
    """Get theme by ID (checks built-in first, then custom)."""
    if theme_id in get_builtin_theme_names():
        return get_builtin_theme(theme_id)
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    return db_theme_to_response(theme) if theme else None

def create_theme_record(data: ThemeCreate) -> Theme:
    """Create theme database record."""
    return Theme(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        is_builtin=False,
        colors=data.colors.model_dump(),
        typography=data.typography.model_dump(),
        spacing=data.spacing.model_dump()
    )

def persist_theme(db: Session, theme: Theme) -> Theme:
    """Persist theme to database."""
    db.add(theme)
    db.commit()
    db.refresh(theme)
    return theme

def create_custom_theme(db: Session, data: ThemeCreate) -> ThemeResponse:
    """Create a new custom theme."""
    theme = create_theme_record(data)
    theme = persist_theme(db, theme)
    return db_theme_to_response(theme)

def apply_theme_updates(theme: Theme, data: ThemeUpdate) -> Theme:
    """Apply updates to theme record."""
    if data.name is not None:
        theme.name = data.name
    if data.description is not None:
        theme.description = data.description
    if data.colors is not None:
        theme.colors = data.colors.model_dump()
    if data.typography is not None:
        theme.typography = data.typography.model_dump()
    if data.spacing is not None:
        theme.spacing = data.spacing.model_dump()
    return theme

def update_custom_theme(
    db: Session, theme_id: str, data: ThemeUpdate
) -> ThemeResponse | None:
    """Update an existing custom theme."""
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    if not theme:
        return None
    theme = apply_theme_updates(theme, data)
    theme = persist_theme(db, theme)
    return db_theme_to_response(theme)

def delete_custom_theme(db: Session, theme_id: str) -> bool:
    """Delete a custom theme."""
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    if not theme:
        return False
    db.delete(theme)
    db.commit()
    return True

def get_theme_css(db: Session, theme_id: str) -> str | None:
    """Get CSS content for theme."""
    theme = get_theme_by_id(db, theme_id)
    return theme.css_content if theme else None

def export_theme_to_file(db: Session, theme_id: str, output_path: Path) -> bool:
    """Export theme CSS to file."""
    css = get_theme_css(db, theme_id)
    if not css:
        return False
    output_path.write_text(css)
    return True
