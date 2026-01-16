"""API routes for presentation sharing."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.share import (
    ShareLinkCreate,
    ShareLinkResponse,
    SharedPresentationResponse,
    ShareAccessRequest,
)
from app.services import share_service

router = APIRouter(prefix="/share", tags=["share"])


@router.post("", response_model=ShareLinkResponse, status_code=201)
def create_share_link(data: ShareLinkCreate, db: Session = Depends(get_db)):
    """Create a share link for a presentation."""
    try:
        return share_service.create_share_link(db, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/presentation/{presentation_id}", response_model=list[ShareLinkResponse])
def list_share_links(presentation_id: str, db: Session = Depends(get_db)):
    """List all share links for a presentation."""
    return share_service.get_share_links(db, presentation_id)


@router.delete("/{link_id}", status_code=204)
def revoke_share_link(link_id: str, db: Session = Depends(get_db)):
    """Revoke a share link."""
    if not share_service.revoke_share_link(db, link_id):
        raise HTTPException(status_code=404, detail="Share link not found")


@router.get("/info/{token}")
def get_share_info(token: str, db: Session = Depends(get_db)):
    """Get info about a share link (for public access page)."""
    info = share_service.get_share_info(db, token)
    if not info:
        raise HTTPException(status_code=404, detail="Share link not found")
    if info.get("error") == "expired":
        raise HTTPException(status_code=410, detail="Share link has expired")
    return info


@router.post("/access/{token}", response_model=SharedPresentationResponse)
def access_shared_presentation(
    token: str,
    request: ShareAccessRequest = ShareAccessRequest(),
    db: Session = Depends(get_db),
):
    """Access a shared presentation."""
    try:
        result = share_service.access_shared_presentation(db, token, request.password)
        if not result:
            raise HTTPException(status_code=404, detail="Share link not found or expired")
        return result
    except PermissionError:
        raise HTTPException(status_code=401, detail="Password required or incorrect")
