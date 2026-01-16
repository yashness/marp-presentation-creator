"""Agentic workflow API routes using Claude Agent SDK v2."""

import json
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from loguru import logger

from app.services.ai.agent import PresentationAgent, create_agent_tool_handlers
from app.services import presentation_service

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentRequest(BaseModel):
    """Agent request model."""
    message: str = Field(..., description="User message for the agent")
    presentation_id: str | None = Field(None, description="Presentation ID to operate on")
    conversation_id: str | None = Field(None, description="Conversation ID for context")


class AgentResponse(BaseModel):
    """Agent response model."""
    response: str
    tool_uses: list[dict] = []
    success: bool = True


class AgentStatusResponse(BaseModel):
    """Agent status response."""
    available: bool
    tools: list[str]


def format_sse(event_type: str, data: dict) -> str:
    """Format data as SSE event."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


async def generate_agent_stream(
    message: str,
    presentation_id: str | None
) -> AsyncGenerator[str, None]:
    """Generate streaming agent response."""

    # Create tool handlers if presentation_id provided
    tool_handlers = {}
    context = None

    if presentation_id:
        pres = presentation_service.get_presentation(presentation_id)
        if pres:
            tool_handlers = create_agent_tool_handlers(
                presentation_id,
                presentation_service.get_presentation,
                lambda pid, data: presentation_service.update_presentation(pid, type('obj', (object,), data)()),
            )
            context = {
                "title": pres.title,
                "slide_count": pres.content.count('---') + 1 if pres.content else 0
            }

    agent = PresentationAgent(tool_handlers)

    if not agent.is_available:
        yield format_sse("error", {"message": "Agent service not available"})
        return

    try:
        for event in agent.run(message, context):
            event_type = event.get("type", "unknown")

            if event_type == "text":
                yield format_sse("text", {"content": event["content"]})

            elif event_type == "tool_use":
                yield format_sse("tool_use", {
                    "id": event["id"],
                    "name": event["name"],
                    "input": event["input"]
                })

            elif event_type == "tool_result":
                yield format_sse("tool_result", {
                    "id": event["id"],
                    "name": event["name"],
                    "result": event["result"]
                })

            elif event_type == "done":
                yield format_sse("done", {"response": event["final_response"]})

            elif event_type == "error":
                yield format_sse("error", {"message": event["message"]})

    except Exception as e:
        logger.error(f"Agent stream error: {e}")
        yield format_sse("error", {"message": str(e)})


@router.post("/run")
async def run_agent(request: AgentRequest) -> AgentResponse:
    """Run the agent with the given message (non-streaming)."""
    logger.info(f"Agent run: presentation={request.presentation_id}")

    # Create tool handlers if presentation_id provided
    tool_handlers = {}
    context = None

    if request.presentation_id:
        pres = presentation_service.get_presentation(request.presentation_id)
        if pres:
            tool_handlers = create_agent_tool_handlers(
                request.presentation_id,
                presentation_service.get_presentation,
                lambda pid, data: presentation_service.update_presentation(pid, type('obj', (object,), data)()),
            )
            context = {
                "title": pres.title,
                "slide_count": pres.content.count('---') + 1 if pres.content else 0
            }

    agent = PresentationAgent(tool_handlers)

    if not agent.is_available:
        raise HTTPException(503, "Agent service not available")

    tool_uses = []
    final_response = ""

    try:
        for event in agent.run(request.message, context):
            if event["type"] == "tool_use":
                tool_uses.append({
                    "name": event["name"],
                    "input": event["input"]
                })
            elif event["type"] == "done":
                final_response = event["final_response"]
            elif event["type"] == "error":
                raise HTTPException(500, event["message"])

        return AgentResponse(
            response=final_response,
            tool_uses=tool_uses,
            success=True
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent error: {e}")
        raise HTTPException(500, str(e))


@router.post("/stream")
async def stream_agent(request: AgentRequest):
    """Stream agent response using SSE."""
    logger.info(f"Agent stream: presentation={request.presentation_id}")

    return StreamingResponse(
        generate_agent_stream(request.message, request.presentation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/status", response_model=AgentStatusResponse)
async def agent_status():
    """Check agent service status."""
    from app.services.ai.agent import PRESENTATION_TOOLS
    agent = PresentationAgent()
    return AgentStatusResponse(
        available=agent.is_available,
        tools=[t["name"] for t in PRESENTATION_TOOLS] if agent.is_available else []
    )


@router.get("/tools")
async def list_tools():
    """List available agent tools."""
    from app.services.ai.agent import PRESENTATION_TOOLS
    return {"tools": PRESENTATION_TOOLS}
