"""Pydantic schemas for asset API."""

from datetime import datetime
from pydantic import BaseModel


class AssetResponse(BaseModel):
    """Response model for asset."""

    id: str
    filename: str
    original_filename: str
    content_type: str
    size_bytes: int
    url: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True
