"""Presentation versioning routes for undo/checkpointing."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services import version_service
from app.core.logger import logger

router = APIRouter(prefix="/versions", tags=["versions"])


class CreateVersionRequest(BaseModel):
    """Create version/checkpoint request."""
    presentation_id: str
    checkpoint_name: str | None = Field(default=None, max_length=100)


class VersionResponse(BaseModel):
    """Version response."""
    id: str
    presentation_id: str
    version_number: int
    title: str
    content: str
    theme_id: str | None
    checkpoint_name: str | None
    created_at: str


class RestoreResponse(BaseModel):
    """Restore response."""
    id: str
    title: str
    content: str
    theme_id: str | None
    restored_from: int


@router.post("", response_model=VersionResponse)
def create_version(request: CreateVersionRequest) -> VersionResponse:
    """Create a new version/checkpoint of a presentation."""
    logger.info(f"Creating version for presentation: {request.presentation_id}")
    result = version_service.create_version(
        presentation_id=request.presentation_id,
        checkpoint_name=request.checkpoint_name
    )
    if not result:
        raise HTTPException(404, "Presentation not found")
    return VersionResponse(**result)


@router.get("/presentation/{presentation_id}", response_model=list[VersionResponse])
def list_versions(presentation_id: str) -> list[VersionResponse]:
    """List all versions of a presentation."""
    results = version_service.list_versions(presentation_id)
    return [VersionResponse(**r) for r in results]


@router.get("/{version_id}", response_model=VersionResponse)
def get_version(version_id: str) -> VersionResponse:
    """Get a specific version."""
    result = version_service.get_version(version_id)
    if not result:
        raise HTTPException(404, "Version not found")
    return VersionResponse(**result)


@router.post("/{version_id}/restore", response_model=RestoreResponse)
def restore_version(version_id: str) -> RestoreResponse:
    """Restore a presentation to a specific version."""
    logger.info(f"Restoring version: {version_id}")
    result = version_service.restore_version(version_id)
    if not result:
        raise HTTPException(404, "Version not found")
    return RestoreResponse(**result)


@router.delete("/{version_id}")
def delete_version(version_id: str) -> dict:
    """Delete a specific version."""
    success = version_service.delete_version(version_id)
    if not success:
        raise HTTPException(404, "Version not found")
    return {"message": "Version deleted"}
