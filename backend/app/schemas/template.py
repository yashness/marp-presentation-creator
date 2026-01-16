"""Schemas for presentation templates."""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class TemplateBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: str = Field(min_length=1, max_length=50)
    content: str = Field(min_length=1)
    theme_id: str | None = None
    thumbnail_url: str | None = None


class TemplateCreate(TemplateBase):
    pass


class TemplateResponse(TemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_builtin: bool
    created_at: datetime
    updated_at: datetime


class TemplateCategory(BaseModel):
    name: str
    description: str
    count: int
