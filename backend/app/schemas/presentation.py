from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class PresentationBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str
    theme_id: str | None = None

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
