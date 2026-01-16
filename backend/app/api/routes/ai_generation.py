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


class RewriteSelectedTextRequest(BaseModel):
    """Request for rewriting selected text within a slide."""
    full_content: str
    selected_text: str = Field(..., min_length=1)
    instruction: str = Field(..., min_length=3)
    selection_start: int = Field(..., ge=0)
    selection_end: int = Field(..., ge=0)


class RewriteSelectedTextResponse(BaseModel):
    """Response for selected text rewrite."""
    success: bool
    content: str | None = None
    rewritten_text: str | None = None
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


class ApplyLayoutRequest(BaseModel):
    """Request for applying a specific layout."""
    content: str
    layout_type: str = Field(..., description="Layout class name")


class ApplyLayoutResponse(BaseModel):
    """Response for layout application."""
    success: bool
    content: str | None = None
    message: str


class DuplicateRewriteRequest(BaseModel):
    """Request for duplicating and rewriting slide content."""
    content: str
    new_topic: str = Field(..., min_length=3)


class RearrangeSlidesRequest(BaseModel):
    """Request for rearranging slides."""
    slides: list[str] = Field(..., min_length=2)


class RearrangeSlidesResponse(BaseModel):
    """Response for slide rearrangement."""
    success: bool
    slides: list[str] | None = None
    message: str


class TransformStyleRequest(BaseModel):
    """Request for transforming presentation style."""
    slides: list[str]
    style: str = Field(..., description="story, teaching, pitch, workshop, technical, executive")


class TransformStyleResponse(BaseModel):
    """Response for style transformation."""
    success: bool
    slides: list[str] | None = None
    message: str


class RewriteForTopicRequest(BaseModel):
    """Request for rewriting presentation for a new topic."""
    slides: list[str]
    new_topic: str = Field(..., min_length=3)
    keep_style: bool = True


class LayoutInfo(BaseModel):
    """Layout class information."""
    name: str
    icon: str
    description: str
    html: str


class LayoutsResponse(BaseModel):
    """Response with available layouts."""
    layouts: dict[str, LayoutInfo]
    callouts: dict[str, LayoutInfo]


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


@router.post("/rewrite-selected-text", response_model=RewriteSelectedTextResponse)
async def rewrite_selected_text(request: RewriteSelectedTextRequest) -> RewriteSelectedTextResponse:
    """Rewrite only the selected text within a slide."""
    logger.info(f"Rewriting selected text: {request.selected_text[:30]}...")

    rewritten = ai_service.rewrite_selected_text(
        request.full_content,
        request.selected_text,
        request.instruction,
        request.selection_start,
        request.selection_end
    )

    if not rewritten:
        return RewriteSelectedTextResponse(success=False, message="Failed to rewrite selected text")

    # Reconstruct full content with rewritten portion
    before = request.full_content[:request.selection_start]
    after = request.full_content[request.selection_end:]
    new_content = before + rewritten + after

    return RewriteSelectedTextResponse(
        success=True,
        content=new_content,
        rewritten_text=rewritten,
        message="Selected text rewritten"
    )


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


@router.get("/layouts", response_model=LayoutsResponse)
async def get_layouts() -> LayoutsResponse:
    """Get available layout classes and callouts."""
    layouts_data = ai_service.get_layouts()
    return LayoutsResponse(
        layouts={k: LayoutInfo(**v) for k, v in layouts_data["layouts"].items()},
        callouts={k: LayoutInfo(**v) for k, v in layouts_data["callouts"].items()}
    )


@router.post("/apply-layout", response_model=ApplyLayoutResponse)
async def apply_layout(request: ApplyLayoutRequest) -> ApplyLayoutResponse:
    """Apply a specific layout to slide content."""
    logger.info(f"Applying layout: {request.layout_type}")

    content = ai_service.apply_layout(request.content, request.layout_type)

    if not content:
        return ApplyLayoutResponse(success=False, message="Failed to apply layout")

    return ApplyLayoutResponse(success=True, content=content, message="Layout applied")


@router.post("/duplicate-rewrite", response_model=RewriteSlideResponse)
async def duplicate_and_rewrite(request: DuplicateRewriteRequest) -> RewriteSlideResponse:
    """Duplicate slide and rewrite for a new topic."""
    logger.info(f"Duplicate and rewrite for: {request.new_topic}")

    content = ai_service.duplicate_and_rewrite_slide(request.content, request.new_topic)

    if not content:
        return RewriteSlideResponse(success=False, message="Failed to rewrite")

    return RewriteSlideResponse(success=True, content=content, message="Slide rewritten")


@router.post("/rearrange-slides", response_model=RearrangeSlidesResponse)
async def rearrange_slides(request: RearrangeSlidesRequest) -> RearrangeSlidesResponse:
    """Rearrange slides for better cohesion."""
    logger.info(f"Rearranging {len(request.slides)} slides...")

    slides = ai_service.rearrange_slides(request.slides)

    return RearrangeSlidesResponse(
        success=True,
        slides=slides,
        message="Slides rearranged for better flow"
    )


@router.post("/transform-style", response_model=TransformStyleResponse)
async def transform_style(request: TransformStyleRequest) -> TransformStyleResponse:
    """Transform presentation to a specific style."""
    logger.info(f"Transforming to {request.style} style...")

    slides = ai_service.transform_style(request.slides, request.style)

    return TransformStyleResponse(
        success=True,
        slides=slides,
        message=f"Transformed to {request.style} style"
    )


@router.post("/rewrite-for-topic", response_model=TransformStyleResponse)
async def rewrite_for_topic(request: RewriteForTopicRequest) -> TransformStyleResponse:
    """Rewrite entire presentation for a new topic."""
    logger.info(f"Rewriting for topic: {request.new_topic}")

    slides = ai_service.rewrite_for_topic(
        request.slides,
        request.new_topic,
        request.keep_style
    )

    return TransformStyleResponse(
        success=True,
        slides=slides,
        message=f"Rewritten for {request.new_topic}"
    )
