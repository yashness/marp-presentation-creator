"""API client for communicating with the backend."""

from typing import Any
import httpx
from marpify.config import API_BASE_URL


def get_client() -> httpx.Client:
    """Create and return HTTP client."""
    return httpx.Client(base_url=API_BASE_URL, timeout=30.0)


def create_presentation(title: str, content: str) -> dict[str, Any]:
    """Create a new presentation."""
    with get_client() as client:
        response = client.post("/presentations", json={"title": title, "content": content})
        response.raise_for_status()
        return response.json()


def list_presentations() -> list[dict[str, Any]]:
    """List all presentations."""
    with get_client() as client:
        response = client.get("/presentations")
        response.raise_for_status()
        return response.json()


def get_presentation(presentation_id: str) -> dict[str, Any]:
    """Get a specific presentation."""
    with get_client() as client:
        response = client.get(f"/presentations/{presentation_id}")
        response.raise_for_status()
        return response.json()


def export_presentation(presentation_id: str, format: str) -> bytes:
    """Export presentation to specified format."""
    with get_client() as client:
        response = client.post(f"/presentations/{presentation_id}/export?format={format}")
        response.raise_for_status()
        return response.content


def preview_presentation(presentation_id: str) -> str:
    """Get presentation preview HTML."""
    with get_client() as client:
        response = client.get(f"/presentations/{presentation_id}/preview")
        response.raise_for_status()
        return response.text


def list_themes() -> list[dict[str, Any]]:
    """List available themes."""
    with get_client() as client:
        response = client.get("/themes")
        response.raise_for_status()
        return response.json()
