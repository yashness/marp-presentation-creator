"""Pydantic schemas for asset API."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AssetResponse(BaseModel):
    """Response model for asset."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    original_filename: str
    content_type: str
    size_bytes: int
    url: str
    created_at: datetime | None = None
