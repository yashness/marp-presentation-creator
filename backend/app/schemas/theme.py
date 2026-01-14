"""Pydantic schemas for theme configuration and responses."""

from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ColorConfig(BaseModel):
    """Color configuration for theme."""
    background: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    text: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    h1: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    h2: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    h3: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    link: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    code_background: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    code_text: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    code_block_background: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    code_block_text: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")

class TypographyConfig(BaseModel):
    """Typography configuration for theme."""
    font_family: str = Field(min_length=1, max_length=200)
    font_size: str = Field(pattern=r"^\d+px$")
    h1_size: str = Field(pattern=r"^\d+px$")
    h1_weight: str = Field(pattern=r"^\d{3}$")
    h2_size: str = Field(pattern=r"^\d+px$")
    h2_weight: str = Field(pattern=r"^\d{3}$")
    h3_size: str = Field(pattern=r"^\d+px$")
    h3_weight: str = Field(pattern=r"^\d{3}$")
    code_font_family: str = Field(min_length=1, max_length=200)

class SpacingConfig(BaseModel):
    """Spacing configuration for theme."""
    slide_padding: str = Field(pattern=r"^\d+px$")
    h1_margin_bottom: str = Field(pattern=r"^\d+px$")
    h2_margin_top: str = Field(pattern=r"^\d+px$")
    code_padding: str = Field(pattern=r"^\d+px \d+px$")
    code_block_padding: str = Field(pattern=r"^\d+px$")
    border_radius: str = Field(pattern=r"^\d+px$")
    code_block_border_radius: str = Field(pattern=r"^\d+px$")

class ThemeConfigBase(BaseModel):
    """Base configuration for themes."""
    colors: ColorConfig
    typography: TypographyConfig
    spacing: SpacingConfig

class ThemeCreate(BaseModel):
    """Schema for creating a custom theme."""
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    colors: ColorConfig
    typography: TypographyConfig
    spacing: SpacingConfig

class ThemeUpdate(BaseModel):
    """Schema for updating a custom theme."""
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    colors: ColorConfig | None = None
    typography: TypographyConfig | None = None
    spacing: SpacingConfig | None = None

class ThemeResponse(BaseModel):
    """Schema for theme API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    is_builtin: bool
    colors: ColorConfig | None = None
    typography: TypographyConfig | None = None
    spacing: SpacingConfig | None = None
    css_content: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
