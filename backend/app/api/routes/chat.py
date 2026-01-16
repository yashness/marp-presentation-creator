"""SSE Chat endpoint for streaming AI responses."""

import json
import asyncio
from typing import AsyncGenerator
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from loguru import logger

from app.services.ai.client import AIClient
from app.services.ai.models import PresentationOutline

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    """Chat message model."""
    role: str = Field(..., description="user or assistant")
    content: str


class ChatRequest(BaseModel):
    """Chat request model."""
    messages: list[ChatMessage]
    context: str | None = Field(default=None, description="Additional context docs")
    mode: str = Field(default="general", description="general, outline, slide, refine")
    current_outline: PresentationOutline | None = None
    current_slide: str | None = None


class StreamEvent(BaseModel):
    """SSE event structure."""
    type: str
    data: str


def format_sse(event_type: str, data: dict | str) -> str:
    """Format data as SSE event."""
    if isinstance(data, dict):
        data = json.dumps(data)
    return f"event: {event_type}\ndata: {data}\n\n"


async def generate_stream(
    messages: list[ChatMessage],
    context: str | None,
    mode: str,
    current_outline: PresentationOutline | None,
    current_slide: str | None,
) -> AsyncGenerator[str, None]:
    """Generate streaming AI response."""
    client = AIClient()

    if not client.is_available:
        yield format_sse("error", {"message": "AI service not available"})
        return

    # Build the prompt based on mode
    prompt = build_prompt(messages, context, mode, current_outline, current_slide)

    # Send thinking start event
    yield format_sse("thinking_start", {"message": "Processing..."})

    try:
        # Stream the response
        full_response = ""
        for chunk in client.stream(prompt, max_tokens=4000, context="chat"):
            full_response += chunk
            yield format_sse("text_delta", {"delta": chunk})
            await asyncio.sleep(0)  # Allow event loop to process

        # Parse structured output if in outline mode
        if mode == "outline":
            outline_data = extract_outline(full_response)
            if outline_data:
                yield format_sse("outline", outline_data)

        # Send completion event
        yield format_sse("done", {"message": "Complete", "full_text": full_response})

    except Exception as e:
        logger.error(f"Stream error: {e}")
        yield format_sse("error", {"message": str(e)})


def build_prompt(
    messages: list[ChatMessage],
    context: str | None,
    mode: str,
    current_outline: PresentationOutline | None,
    current_slide: str | None,
) -> str:
    """Build AI prompt based on mode and context."""
    system_prompts = {
        "general": """You are a presentation expert helping create Marp markdown presentations.
Provide helpful, concise advice about presentations. When suggesting slide content,
use proper Marp markdown format with --- separators.""",

        "outline": """You are creating a presentation outline. Return a structured outline with:
1. A compelling title
2. Clear slide titles with bullet points for each slide
3. Notes for speaker narration

Format your response as a numbered list of slides with their key points.""",

        "slide": """You are improving a single slide. The current slide content is provided.
Suggest improvements while maintaining Marp markdown format. Include proper
headers, lists, and any layout classes needed.""",

        "refine": """You are refining presentation content based on user feedback.
Make targeted improvements while preserving the overall structure and style."""
    }

    prompt_parts = [system_prompts.get(mode, system_prompts["general"])]

    # Add context if provided
    if context:
        prompt_parts.append(f"\n## Additional Context\n{context}")

    # Add current outline if available
    if current_outline:
        outline_text = format_outline_for_prompt(current_outline)
        prompt_parts.append(f"\n## Current Outline\n{outline_text}")

    # Add current slide if available
    if current_slide:
        prompt_parts.append(f"\n## Current Slide Content\n```markdown\n{current_slide}\n```")

    # Add conversation history
    prompt_parts.append("\n## Conversation")
    for msg in messages:
        role_label = "User" if msg.role == "user" else "Assistant"
        prompt_parts.append(f"\n{role_label}: {msg.content}")

    return "\n".join(prompt_parts)


def format_outline_for_prompt(outline: PresentationOutline) -> str:
    """Format outline for inclusion in prompt."""
    lines = [f"Title: {outline.title}", ""]
    for i, slide in enumerate(outline.slides, 1):
        lines.append(f"{i}. {slide.title}")
        for point in slide.content_points:
            lines.append(f"   - {point}")
        if slide.notes:
            lines.append(f"   [Notes: {slide.notes}]")
    return "\n".join(lines)


def extract_outline(response: str) -> dict | None:
    """Try to extract structured outline from response."""
    # Simple extraction - could be enhanced with more sophisticated parsing
    import re

    lines = response.strip().split("\n")
    title_match = re.search(r"title[:\s]+(.+)", response, re.IGNORECASE)
    title = title_match.group(1).strip() if title_match else "Untitled Presentation"

    slides = []
    current_slide = None

    for line in lines:
        # Match numbered slide titles
        slide_match = re.match(r"^\d+\.\s+(.+)", line)
        if slide_match:
            if current_slide:
                slides.append(current_slide)
            current_slide = {
                "title": slide_match.group(1).strip(),
                "content_points": [],
                "notes": ""
            }
        # Match bullet points
        elif current_slide and re.match(r"^\s*[-•]\s+", line):
            point = re.sub(r"^\s*[-•]\s+", "", line).strip()
            if point:
                current_slide["content_points"].append(point)

    if current_slide:
        slides.append(current_slide)

    if slides:
        return {
            "title": title,
            "slides": slides
        }
    return None


@router.post("/stream")
async def stream_chat(request: ChatRequest):
    """Stream AI chat response using SSE."""
    logger.info(f"Chat stream: mode={request.mode}, messages={len(request.messages)}")

    return StreamingResponse(
        generate_stream(
            request.messages,
            request.context,
            request.mode,
            request.current_outline,
            request.current_slide
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/status")
async def chat_status():
    """Check chat service status."""
    client = AIClient()
    return {
        "available": client.is_available,
        "streaming": True,
        "modes": ["general", "outline", "slide", "refine"]
    }
