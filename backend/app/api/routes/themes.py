"""API routes for theme management."""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import tempfile

from app.schemas.theme import ThemeResponse, ThemeCreate, ThemeUpdate
from app.services import theme_service
from app.core.database import get_db
from app.core.logger import logger

router = APIRouter(prefix="/themes", tags=["themes"])

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
