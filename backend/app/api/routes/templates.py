"""API routes for presentation templates."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.template import TemplateCreate, TemplateResponse, TemplateCategory
from app.services import template_service

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[TemplateResponse])
def list_templates(category: str | None = None, db: Session = Depends(get_db)):
    """List all available templates."""
    return template_service.list_templates(db, category)


@router.get("/categories", response_model=list[TemplateCategory])
def list_categories(db: Session = Depends(get_db)):
    """List template categories with counts."""
    return template_service.list_categories(db)


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: str, db: Session = Depends(get_db)):
    """Get a specific template by ID."""
    template = template_service.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("", response_model=TemplateResponse, status_code=201)
def create_template(data: TemplateCreate, db: Session = Depends(get_db)):
    """Create a custom template."""
    return template_service.create_template(db, data)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, db: Session = Depends(get_db)):
    """Delete a custom template."""
    success = template_service.delete_template(db, template_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Template not found or is a built-in template",
        )
