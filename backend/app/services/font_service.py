"""Service for managing custom fonts."""

import os
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from loguru import logger

from app.models.font import Font
from app.schemas.font import FontResponse, FontFamilyResponse


FONTS_DIR = Path("data/fonts")
FONTS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".ttf", ".otf", ".woff", ".woff2"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB for fonts


def save_font(
    db: Session,
    file_content: bytes,
    original_filename: str,
    content_type: str,
    family_name: str,
    style: str = "normal",
    weight: str = "400"
) -> FontResponse | None:
    """Save uploaded font to filesystem and database."""
    try:
        ext = Path(original_filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            logger.error(f"Invalid font extension: {ext}")
            return None

        if len(file_content) > MAX_FILE_SIZE:
            logger.error(f"Font file too large: {len(file_content)} bytes")
            return None

        font_id = str(uuid.uuid4())
        filename = f"{font_id}{ext}"
        file_path = FONTS_DIR / filename

        with open(file_path, "wb") as f:
            f.write(file_content)

        font = Font(
            id=font_id,
            family_name=family_name,
            style=style,
            weight=weight,
            filename=filename,
            original_filename=original_filename,
            content_type=content_type,
            size_bytes=len(file_content)
        )

        db.add(font)
        db.commit()
        db.refresh(font)

        logger.info(f"Saved font: {font_id} ({family_name} {weight} {style})")

        return _to_response(font)

    except Exception as e:
        logger.error(f"Failed to save font: {e}")
        db.rollback()
        return None


def _to_response(font: Font) -> FontResponse:
    """Convert font model to response."""
    return FontResponse(
        id=font.id,
        family_name=font.family_name,
        style=font.style,
        weight=font.weight,
        filename=font.filename,
        original_filename=font.original_filename,
        content_type=font.content_type,
        size_bytes=font.size_bytes,
        url=f"/api/fonts/{font.id}",
        created_at=font.created_at
    )


def get_font(db: Session, font_id: str) -> Font | None:
    """Get font by ID."""
    return db.query(Font).filter(Font.id == font_id).first()


def get_font_path(filename: str) -> Path | None:
    """Get filesystem path for font."""
    file_path = FONTS_DIR / filename
    if file_path.exists():
        return file_path
    return None


def list_fonts(db: Session) -> list[FontResponse]:
    """List all fonts."""
    fonts = db.query(Font).order_by(Font.family_name, Font.weight).all()
    return [_to_response(font) for font in fonts]


def list_font_families(db: Session) -> list[FontFamilyResponse]:
    """List fonts grouped by family."""
    fonts = db.query(Font).order_by(Font.family_name, Font.weight).all()

    families: dict[str, list[FontResponse]] = {}
    for font in fonts:
        if font.family_name not in families:
            families[font.family_name] = []
        families[font.family_name].append(_to_response(font))

    return [
        FontFamilyResponse(
            family_name=name,
            variants=variants,
            css_family=f'"{name}", sans-serif'
        )
        for name, variants in families.items()
    ]


def delete_font(db: Session, font_id: str) -> bool:
    """Delete font from filesystem and database."""
    font = get_font(db, font_id)
    if not font:
        return False

    try:
        file_path = FONTS_DIR / font.filename
        if file_path.exists():
            os.remove(file_path)

        db.delete(font)
        db.commit()

        logger.info(f"Deleted font: {font_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to delete font: {e}")
        db.rollback()
        return False


def generate_font_face_css(db: Session) -> str:
    """Generate @font-face CSS for all uploaded fonts."""
    fonts = db.query(Font).all()
    if not fonts:
        return ""

    css_parts = []
    for font in fonts:
        ext = Path(font.filename).suffix.lower()
        format_map = {
            ".ttf": "truetype",
            ".otf": "opentype",
            ".woff": "woff",
            ".woff2": "woff2"
        }
        font_format = format_map.get(ext, "truetype")

        css_parts.append(f"""@font-face {{
  font-family: "{font.family_name}";
  src: url("/api/fonts/{font.id}") format("{font_format}");
  font-weight: {font.weight};
  font-style: {font.style};
  font-display: swap;
}}""")

    return "\n\n".join(css_parts)
