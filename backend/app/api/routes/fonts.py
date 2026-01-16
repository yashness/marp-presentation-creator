"""API routes for custom font management."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import font_service
from app.schemas.font import FontResponse, FontFamilyResponse

router = APIRouter(prefix="/fonts", tags=["fonts"])


@router.post("", response_model=FontResponse)
async def upload_font(
    file: UploadFile,
    family_name: str = Form(...),
    style: str = Form("normal"),
    weight: str = Form("400"),
    db: Session = Depends(get_db)
):
    """Upload a custom font file."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    content = await file.read()
    content_type = file.content_type or "font/ttf"

    result = font_service.save_font(
        db=db,
        file_content=content,
        original_filename=file.filename,
        content_type=content_type,
        family_name=family_name,
        style=style,
        weight=weight
    )

    if not result:
        raise HTTPException(
            status_code=400,
            detail="Failed to upload font. Check format (.ttf, .otf, .woff, .woff2) and size (<10MB)."
        )

    return result


@router.get("", response_model=list[FontResponse])
def list_fonts(db: Session = Depends(get_db)):
    """List all uploaded fonts."""
    return font_service.list_fonts(db)


@router.get("/families", response_model=list[FontFamilyResponse])
def list_font_families(db: Session = Depends(get_db)):
    """List fonts grouped by family."""
    return font_service.list_font_families(db)


@router.get("/css")
def get_font_css(db: Session = Depends(get_db)):
    """Get @font-face CSS for all uploaded fonts."""
    css = font_service.generate_font_face_css(db)
    return {"css": css}


@router.get("/{font_id}")
def get_font_file(font_id: str, db: Session = Depends(get_db)):
    """Get font file by ID."""
    font = font_service.get_font(db, font_id)
    if not font:
        raise HTTPException(status_code=404, detail="Font not found")

    file_path = font_service.get_font_path(font.filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Font file not found")

    return FileResponse(
        path=file_path,
        media_type=font.content_type,
        filename=font.original_filename
    )


@router.delete("/{font_id}")
def delete_font(font_id: str, db: Session = Depends(get_db)):
    """Delete a font."""
    if not font_service.delete_font(db, font_id):
        raise HTTPException(status_code=404, detail="Font not found")
    return {"success": True, "message": "Font deleted"}
