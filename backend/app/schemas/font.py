"""Pydantic schemas for font API."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class FontCreate(BaseModel):
    """Create font request."""
    family_name: str
    style: str = "normal"
    weight: str = "400"


class FontResponse(BaseModel):
    """Response model for font."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    family_name: str
    style: str
    weight: str
    filename: str
    original_filename: str
    content_type: str
    size_bytes: int
    url: str
    created_at: datetime | None = None


class FontFamilyResponse(BaseModel):
    """Response model for font family with all variants."""

    model_config = ConfigDict(from_attributes=True)

    family_name: str
    variants: list[FontResponse]
    css_family: str  # CSS font-family value to use
