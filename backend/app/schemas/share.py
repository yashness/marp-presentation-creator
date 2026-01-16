"""Schemas for presentation sharing."""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class ShareLinkCreate(BaseModel):
    presentation_id: str
    is_public: bool = True
    password: str | None = None
    expires_in_days: int | None = None


class ShareLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    presentation_id: str
    token: str
    is_public: bool
    expires_at: datetime | None
    view_count: int
    created_at: datetime
    share_url: str


class ShareLinkUpdate(BaseModel):
    is_public: bool | None = None
    password: str | None = None
    expires_in_days: int | None = None


class SharedPresentationResponse(BaseModel):
    id: str
    title: str
    content: str
    theme_id: str | None = None
    created_at: datetime
    updated_at: datetime


class ShareAccessRequest(BaseModel):
    password: str | None = None
