from pydantic import BaseModel, Field

class ThemeBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    css_content: str

class ThemeCreate(ThemeBase):
    pass

class ThemeResponse(ThemeBase):
    id: str

    class Config:
        from_attributes = True
