"""Data models for AI generation."""

from pydantic import BaseModel


class SlideOutline(BaseModel):
    """Outline for a single slide."""
    title: str
    content_points: list[str]
    notes: str = ""


class PresentationOutline(BaseModel):
    """Outline for entire presentation."""
    title: str
    slides: list[SlideOutline]
    narration_instructions: str | None = None
    comment_max_ratio: float | None = None


class BatchProgress(BaseModel):
    """Progress info for streaming batch operations."""
    batch_index: int
    total_batches: int
    slides_completed: int
    total_slides: int
    current_batch_content: str = ""
