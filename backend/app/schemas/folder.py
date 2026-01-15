"""Folder schemas."""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime

class FolderBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    parent_id: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Folder name cannot be empty")
        return v.strip()

class FolderCreate(FolderBase):
    pass

class FolderUpdate(BaseModel):
    name: str | None = None
    parent_id: str | None = None

class FolderResponse(FolderBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
