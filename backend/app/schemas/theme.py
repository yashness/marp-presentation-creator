from pydantic import BaseModel, Field, ConfigDict

class ThemeBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    css_content: str

class ThemeCreate(ThemeBase):
    pass

class ThemeResponse(ThemeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
