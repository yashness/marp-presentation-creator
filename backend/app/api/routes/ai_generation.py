"""AI-powered presentation generation API routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from loguru import logger

from app.services.ai_service import AIService, PresentationOutline, SlideOutline


router = APIRouter(prefix="/ai", tags=["ai"])
ai_service = AIService()


class GenerateOutlineRequest(BaseModel):
    """Request model for generating outline."""
    description: str = Field(..., min_length=10, description="Description of the presentation")
    slide_count: int | None = Field(default=None, ge=1, le=30, description="Desired slide count")
    subtopic_count: int | None = Field(default=None, ge=1, le=20, description="Desired subtopic count")
    audience: str | None = Field(default=None, description="Target audience")
    flavor: str | None = Field(default=None, description="Extra flavor or angle")
    narration_instructions: str | None = Field(default=None, description="Narration style instructions")
    comment_max_ratio: float | None = Field(default=None, ge=0.1, le=1.0, description="Max narration length ratio")


class GenerateOutlineResponse(BaseModel):
    """Response model for outline generation."""
    success: bool
    outline: PresentationOutline | None = None
    message: str


class GenerateContentRequest(BaseModel):
    """Request model for generating full content."""
    outline: PresentationOutline
    theme: str = Field(default="professional", description="Presentation style/theme")


class GenerateContentResponse(BaseModel):
    """Response model for content generation."""
    success: bool
    content: str | None = None
    message: str


class RewriteSlideRequest(BaseModel):
    """Request model for rewriting a slide."""
    current_content: str = Field(..., description="Current slide markdown")
    instruction: str = Field(..., min_length=5, description="How to modify the slide")


class RewriteSlideResponse(BaseModel):
    """Response model for slide rewrite."""
    success: bool
    content: str | None = None
    message: str


class GenerateImageRequest(BaseModel):
    """Request model for generating images."""
    prompt: str = Field(..., min_length=10, description="Description of the image")
    size: str = Field(default="1024x1024", description="Image size")
    quality: str = Field(default="standard", description="Image quality")


class GenerateImageResponse(BaseModel):
    """Response model for image generation."""
    success: bool
    image_data: str | None = None
    message: str


@router.post("/generate-outline", response_model=GenerateOutlineResponse)
async def generate_outline(request: GenerateOutlineRequest) -> GenerateOutlineResponse:
    """Generate presentation outline from description.

    Args:
        request: Description of desired presentation

    Returns:
        Presentation outline with suggested slides

    Raises:
        HTTPException: If generation fails
    """
    logger.info(f"Generating outline for: {request.description[:50]}...")

    outline = ai_service.generate_outline(
        request.description,
        slide_count=request.slide_count,
        subtopic_count=request.subtopic_count,
        audience=request.audience,
        flavor=request.flavor,
        narration_instructions=request.narration_instructions,
        comment_max_ratio=request.comment_max_ratio
    )

    if not outline:
        return GenerateOutlineResponse(
            success=False,
            message="Failed to generate outline. Please try again."
        )

    return GenerateOutlineResponse(
        success=True,
        outline=outline,
        message="Outline generated successfully"
    )


@router.post("/generate-content", response_model=GenerateContentResponse)
async def generate_content(request: GenerateContentRequest) -> GenerateContentResponse:
    """Generate full presentation content from outline.

    Args:
        request: Presentation outline and theme

    Returns:
        Complete Marp markdown presentation

    Raises:
        HTTPException: If generation fails
    """
    logger.info(f"Generating content for: {request.outline.title}")

    content = ai_service.generate_full_presentation(request.outline, request.theme)

    if not content:
        return GenerateContentResponse(
            success=False,
            message="Failed to generate content. Please try again."
        )

    return GenerateContentResponse(
        success=True,
        content=content,
        message="Content generated successfully"
    )


@router.post("/rewrite-slide", response_model=RewriteSlideResponse)
async def rewrite_slide(request: RewriteSlideRequest) -> RewriteSlideResponse:
    """Rewrite a slide based on instruction.

    Args:
        request: Current content and modification instruction

    Returns:
        Rewritten slide content

    Raises:
        HTTPException: If rewrite fails
    """
    logger.info(f"Rewriting slide with instruction: {request.instruction[:50]}...")

    content = ai_service.rewrite_slide(request.current_content, request.instruction)

    if not content:
        return RewriteSlideResponse(
            success=False,
            message="Failed to rewrite slide. Please try again."
        )

    return RewriteSlideResponse(
        success=True,
        content=content,
        message="Slide rewritten successfully"
    )


@router.post("/generate-image", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest) -> GenerateImageResponse:
    """Generate image using DALL-E.

    Args:
        request: Image prompt and parameters

    Returns:
        Base64 encoded image data

    Raises:
        HTTPException: If generation fails
    """
    logger.info(f"Generating image: {request.prompt[:50]}...")

    image_data = ai_service.generate_image(
        request.prompt,
        request.size,
        request.quality
    )

    if not image_data:
        return GenerateImageResponse(
            success=False,
            message="Failed to generate image. Please try again."
        )

    return GenerateImageResponse(
        success=True,
        image_data=image_data,
        message="Image generated successfully"
    )


@router.get("/status")
async def get_ai_status() -> dict:
    """Check AI service status.

    Returns:
        Service availability status
    """
    available = ai_service.client is not None

    return {
        "available": available,
        "message": "AI service is ready" if available else "AI service not configured. Check Azure credentials."
    }
