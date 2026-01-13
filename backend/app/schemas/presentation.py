from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime

class PresentationBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    theme_id: str | None = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Content cannot be empty or whitespace only")
        return v

class PresentationCreate(PresentationBase):
    pass

class PresentationUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    theme_id: str | None = None

class PresentationResponse(PresentationBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
