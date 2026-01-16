"""AI-powered presentation generation API routes."""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from loguru import logger

from app.services.ai_service import AIService, PresentationOutline

router = APIRouter(prefix="/ai", tags=["ai"])
ai_service = AIService()


# -----------------------------------------------------------------------------
# Request/Response Models
# -----------------------------------------------------------------------------

class GenerateOutlineRequest(BaseModel):
    """Request for outline generation."""
    description: str = Field(..., min_length=10)
    slide_count: int | None = Field(default=None, ge=1, le=50)
    subtopic_count: int | None = Field(default=None, ge=1, le=20)
    audience: str | None = None
    flavor: str | None = None
    narration_instructions: str | None = None
    comment_max_ratio: float | None = Field(default=None, ge=0.1, le=1.0)


class GenerateOutlineResponse(BaseModel):
    """Response for outline generation."""
    success: bool
    outline: PresentationOutline | None = None
    message: str


class GenerateContentRequest(BaseModel):
    """Request for content generation."""
    outline: PresentationOutline
    theme: str = "professional"


class GenerateContentResponse(BaseModel):
    """Response for content generation."""
    success: bool
    content: str | None = None
    message: str


class GenerateCommentaryRequest(BaseModel):
    """Request for commentary generation."""
    slides: list[dict] = Field(..., description="List of {content: str}")
    style: str = "professional"


class GenerateCommentaryResponse(BaseModel):
    """Response for commentary generation."""
    success: bool
    comments: list[str] | None = None
    message: str


class RewriteSlideRequest(BaseModel):
    """Request for slide rewrite."""
    current_content: str
    instruction: str = Field(..., min_length=5)
    length: str = "medium"


class RewriteSlideResponse(BaseModel):
    """Response for slide rewrite."""
    success: bool
    content: str | None = None
    message: str


class SlideOperationRequest(BaseModel):
    """Request for slide operations (layout, restyle, etc.)."""
    content: str
    operation: str = Field(..., description="layout, restyle, simplify, expand, split")
    style: str | None = None


class SlideOperationResponse(BaseModel):
    """Response for slide operations."""
    success: bool
    content: str | None = None
    slides: list[str] | None = None  # For split operation
    message: str


class RegenerateCommentRequest(BaseModel):
    """Request for single comment regeneration."""
    slide_content: str
    previous_comment: str | None = None
    context_before: str | None = None
    context_after: str | None = None
    style: str = "professional"


class RegenerateCommentResponse(BaseModel):
    """Response for comment regeneration."""
    success: bool
    comment: str | None = None
    message: str


class RegenerateAllCommentsRequest(BaseModel):
    """Request for regenerating all comments."""
    slides: list[dict]
    style: str = "professional"


class RegenerateAllCommentsResponse(BaseModel):
    """Response for regenerating all comments."""
    success: bool
    comments: list[str] | None = None
    message: str


class GenerateImageRequest(BaseModel):
    """Request for image generation."""
    prompt: str = Field(..., min_length=10)
    size: str = "1024x1024"
    quality: str = "standard"


class GenerateImageResponse(BaseModel):
    """Response for image generation."""
    success: bool
    image_data: str | None = None
    message: str


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.post("/generate-outline", response_model=GenerateOutlineResponse)
async def generate_outline(request: GenerateOutlineRequest) -> GenerateOutlineResponse:
    """Generate presentation outline with batching for large requests."""
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
        return GenerateOutlineResponse(success=False, message="Failed to generate outline")

    return GenerateOutlineResponse(success=True, outline=outline, message="Outline generated")


@router.post("/generate-content", response_model=GenerateContentResponse)
async def generate_content(request: GenerateContentRequest) -> GenerateContentResponse:
    """Generate presentation content (without comments)."""
    logger.info(f"Generating content for: {request.outline.title}")

    content = ai_service.generate_full_presentation(request.outline, request.theme)

    if not content:
        return GenerateContentResponse(success=False, message="Failed to generate content")

    return GenerateContentResponse(success=True, content=content, message="Content generated")


@router.post("/generate-commentary", response_model=GenerateCommentaryResponse)
async def generate_commentary(request: GenerateCommentaryRequest) -> GenerateCommentaryResponse:
    """Generate audio-aware commentary for slides in batches."""
    logger.info(f"Generating commentary for {len(request.slides)} slides...")

    comments = ai_service.generate_commentary(request.slides, request.style)

    return GenerateCommentaryResponse(
        success=True,
        comments=comments,
        message=f"Generated {len(comments)} comments"
    )


@router.post("/rewrite-slide", response_model=RewriteSlideResponse)
async def rewrite_slide(request: RewriteSlideRequest) -> RewriteSlideResponse:
    """Rewrite slide with custom instruction."""
    logger.info(f"Rewriting slide: {request.instruction[:50]}...")

    # Add length hint to instruction
    length_hint = {
        "short": " Keep content brief.",
        "long": " Add more detail.",
        "medium": ""
    }.get(request.length, "")

    content = ai_service.rewrite_slide(request.current_content, request.instruction + length_hint)

    if not content:
        return RewriteSlideResponse(success=False, message="Failed to rewrite")

    return RewriteSlideResponse(success=True, content=content, message="Slide rewritten")


@router.post("/slide-operation", response_model=SlideOperationResponse)
async def slide_operation(request: SlideOperationRequest) -> SlideOperationResponse:
    """Perform slide operation (layout, restyle, simplify, expand, split)."""
    logger.info(f"Slide operation: {request.operation}")

    op = request.operation.lower()

    if op == "layout":
        result = ai_service.rewrite_layout(request.content)
        return SlideOperationResponse(success=True, content=result, message="Layout changed")

    elif op == "restyle":
        style = request.style or "modern"
        result = ai_service.restyle_slide(request.content, style)
        return SlideOperationResponse(success=True, content=result, message="Slide restyled")

    elif op == "simplify":
        result = ai_service.simplify_slide(request.content)
        return SlideOperationResponse(success=True, content=result, message="Slide simplified")

    elif op == "expand":
        result = ai_service.expand_slide(request.content)
        return SlideOperationResponse(success=True, content=result, message="Slide expanded")

    elif op == "split":
        slides = ai_service.split_slide(request.content)
        return SlideOperationResponse(success=True, slides=slides, message=f"Split into {len(slides)} slides")

    return SlideOperationResponse(success=False, message=f"Unknown operation: {op}")


@router.post("/regenerate-comment", response_model=RegenerateCommentResponse)
async def regenerate_comment(request: RegenerateCommentRequest) -> RegenerateCommentResponse:
    """Regenerate single slide comment."""
    logger.info("Regenerating comment...")

    comment = ai_service.regenerate_comment(
        request.slide_content,
        request.previous_comment,
        request.context_before,
        request.context_after,
        request.style
    )

    return RegenerateCommentResponse(success=True, comment=comment, message="Comment regenerated")


@router.post("/regenerate-all-comments", response_model=RegenerateAllCommentsResponse)
async def regenerate_all_comments(request: RegenerateAllCommentsRequest) -> RegenerateAllCommentsResponse:
    """Regenerate all comments with batching."""
    logger.info(f"Regenerating {len(request.slides)} comments...")

    comments = ai_service.regenerate_all_comments(request.slides, request.style)

    return RegenerateAllCommentsResponse(
        success=True,
        comments=comments,
        message=f"Regenerated {len(comments)} comments"
    )


@router.post("/generate-image", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest) -> GenerateImageResponse:
    """Generate image using DALL-E."""
    logger.info(f"Generating image: {request.prompt[:50]}...")

    image_data = ai_service.generate_image(request.prompt, request.size, request.quality)

    if not image_data:
        return GenerateImageResponse(success=False, message="Failed to generate image")

    return GenerateImageResponse(success=True, image_data=image_data, message="Image generated")


@router.get("/status")
async def get_ai_status() -> dict:
    """Check AI service status."""
    available = ai_service.is_available
    return {
        "available": available,
        "message": "AI ready" if available else "AI not configured"
    }
