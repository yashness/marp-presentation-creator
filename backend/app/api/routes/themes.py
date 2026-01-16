"""API routes for theme management."""

import base64
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import tempfile
from pydantic import BaseModel

from app.schemas.theme import ThemeResponse, ThemeCreate, ThemeUpdate
from app.services import theme_service
from app.services.theme_service import build_theme_config_with_brand_colors
from app.services.ai_service import AIService
from app.services.color_extraction_service import ColorExtractionService
from app.core.database import get_db
from app.core.logger import logger

router = APIRouter(prefix="/themes", tags=["themes"])
ai_service = AIService()
color_extraction_service = ColorExtractionService()


class GenerateThemeRequest(BaseModel):
    """Request model for AI theme generation."""
    theme_name: str
    brand_colors: list[str]
    description: str = ""


class GenerateThemeResponse(BaseModel):
    """Response model for theme generation."""
    success: bool
    theme: ThemeResponse | None = None
    message: str


class ExtractColorsResponse(BaseModel):
    """Response model for color extraction."""
    success: bool
    colors: list[str] = []
    color_names: dict[str, str] = {}
    description: str = ""
    message: str

def get_session() -> Session:
    """Get database session."""
    db = get_db()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=list[ThemeResponse])
def list_themes(db: Session = Depends(get_session)) -> list[ThemeResponse]:
    """List all themes (built-in + custom)."""
    logger.info("Listing all themes")
    return theme_service.list_all_themes(db)

@router.get("/{theme_id}", response_model=ThemeResponse)
def get_theme(theme_id: str, db: Session = Depends(get_session)) -> ThemeResponse:
    """Get theme by ID."""
    logger.info(f"Fetching theme: {theme_id}")
    theme = theme_service.get_theme_by_id(db, theme_id)
    if not theme:
        raise HTTPException(404, f"Theme {theme_id} not found")
    return theme

@router.post("", response_model=ThemeResponse, status_code=201)
def create_theme(data: ThemeCreate, db: Session = Depends(get_session)) -> ThemeResponse:
    """Create a new custom theme."""
    logger.info(f"Creating theme: {data.name}")
    try:
        return theme_service.create_custom_theme(db, data)
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(409, f"Theme with name '{data.name}' already exists")
        raise HTTPException(500, f"Failed to create theme: {str(e)}")

@router.put("/{theme_id}", response_model=ThemeResponse)
def update_theme(
    theme_id: str, data: ThemeUpdate, db: Session = Depends(get_session)
) -> ThemeResponse:
    """Update an existing custom theme."""
    logger.info(f"Updating theme: {theme_id}")
    theme = theme_service.update_custom_theme(db, theme_id, data)
    if not theme:
        raise HTTPException(404, f"Theme {theme_id} not found")
    return theme

@router.delete("/{theme_id}", status_code=204)
def delete_theme(theme_id: str, db: Session = Depends(get_session)) -> None:
    """Delete a custom theme."""
    logger.info(f"Deleting theme: {theme_id}")
    success = theme_service.delete_custom_theme(db, theme_id)
    if not success:
        raise HTTPException(404, f"Theme {theme_id} not found")

@router.get("/{theme_id}/css", response_class=Response)
def get_theme_css(theme_id: str, db: Session = Depends(get_session)) -> Response:
    """Get CSS content for theme."""
    logger.info(f"Fetching CSS for theme: {theme_id}")
    css = theme_service.get_theme_css(db, theme_id)
    if not css:
        raise HTTPException(404, f"Theme {theme_id} not found")
    return Response(content=css, media_type="text/css")

@router.get("/{theme_id}/export")
def export_theme(theme_id: str, db: Session = Depends(get_session)) -> FileResponse:
    """Export theme as CSS file."""
    logger.info(f"Exporting theme: {theme_id}")

    css = theme_service.get_theme_css(db, theme_id)
    if not css:
        raise HTTPException(404, f"Theme {theme_id} not found")

    with tempfile.NamedTemporaryFile(mode='w', suffix='.css', delete=False) as f:
        f.write(css)
        temp_path = Path(f.name)

    filename = f"{theme_id}.css"
    return FileResponse(
        path=temp_path,
        media_type="text/css",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/generate-ai", response_model=GenerateThemeResponse)
def generate_theme_with_ai(
    request: GenerateThemeRequest,
    db: Session = Depends(get_session)
) -> GenerateThemeResponse:
    """Generate a theme using AI based on brand colors and description.

    Args:
        request: Theme generation parameters
        db: Database session

    Returns:
        Generated theme with CSS content
    """
    logger.info(f"Generating AI theme: {request.theme_name}")

    try:
        # Generate CSS using AI
        css_content = ai_service.generate_theme_css(
            theme_name=request.theme_name,
            brand_colors=request.brand_colors,
            description=request.description
        )

        if not css_content:
            return GenerateThemeResponse(
                success=False,
                theme=None,
                message="Failed to generate theme CSS with AI"
            )

        # Create the theme in the database
        colors, typography, spacing = build_theme_config_with_brand_colors(request.brand_colors)
        theme_data = ThemeCreate(
            name=request.theme_name,
            description=request.description or f"AI-generated theme with colors: {', '.join(request.brand_colors)}",
            colors=colors,
            typography=typography,
            spacing=spacing
        )

        theme = theme_service.create_custom_theme(db, theme_data)

        return GenerateThemeResponse(
            success=True,
            theme=theme,
            message="Theme generated successfully"
        )

    except Exception as e:
        logger.error(f"Failed to generate AI theme: {e}")
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(409, f"Theme with name '{request.theme_name}' already exists")
        raise HTTPException(500, f"Failed to generate theme: {str(e)}")


@router.post("/extract-colors", response_model=ExtractColorsResponse)
async def extract_colors_from_image(
    file: UploadFile = File(...)
) -> ExtractColorsResponse:
    """Extract colors from an uploaded screenshot/image using AI vision.

    Args:
        file: Image file (PNG, JPG, WEBP, GIF)

    Returns:
        Extracted colors with descriptions
    """
    logger.info(f"Extracting colors from image: {file.filename}")

    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            400,
            f"Invalid file type: {file.content_type}. Allowed: PNG, JPG, WEBP, GIF"
        )

    try:
        # Read and encode image
        image_data = await file.read()
        base64_image = base64.b64encode(image_data).decode("utf-8")

        # Determine media type
        media_type = file.content_type or "image/png"

        # Extract colors using AI
        result = color_extraction_service.extract_colors(base64_image, media_type)

        if not result:
            return ExtractColorsResponse(
                success=False,
                colors=[],
                message="Failed to extract colors from image"
            )

        return ExtractColorsResponse(
            success=True,
            colors=result.get("colors", []),
            color_names=result.get("color_names", {}),
            description=result.get("description", ""),
            message="Colors extracted successfully"
        )

    except Exception as e:
        logger.error(f"Failed to extract colors: {e}")
        raise HTTPException(500, f"Failed to extract colors: {str(e)}")
