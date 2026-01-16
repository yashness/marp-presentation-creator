"""Service for managing presentation share links."""

import uuid
import secrets
import hashlib
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.share_link import ShareLink
from app.models.presentation import Presentation
from app.schemas.share import ShareLinkCreate, ShareLinkResponse, SharedPresentationResponse
from app.core.config import settings


def _hash_password(password: str) -> str:
    """Hash a password with salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{hashed}"


def _verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against stored hash."""
    if not stored_hash or ":" not in stored_hash:
        return False
    salt, hashed = stored_hash.split(":", 1)
    computed = hashlib.sha256((password + salt).encode()).hexdigest()
    return computed == hashed


def _generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


def _get_share_url(token: str) -> str:
    """Build the public share URL."""
    base_url = getattr(settings, 'frontend_url', 'http://localhost:3000')
    return f"{base_url}/share/{token}"


def _to_response(link: ShareLink) -> ShareLinkResponse:
    """Convert ShareLink model to response schema."""
    return ShareLinkResponse(
        id=link.id,
        presentation_id=link.presentation_id,
        token=link.token,
        is_public=link.is_public,
        expires_at=link.expires_at,
        view_count=int(link.view_count or "0"),
        created_at=link.created_at,
        share_url=_get_share_url(link.token),
    )


def create_share_link(db: Session, data: ShareLinkCreate) -> ShareLinkResponse:
    """Create a new share link for a presentation."""
    presentation = db.query(Presentation).filter_by(id=data.presentation_id).first()
    if not presentation:
        raise ValueError("Presentation not found")

    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.now() + timedelta(days=data.expires_in_days)

    password_hash = None
    if data.password:
        password_hash = _hash_password(data.password)

    link = ShareLink(
        id=str(uuid.uuid4()),
        presentation_id=data.presentation_id,
        token=_generate_token(),
        is_public=data.is_public,
        password_hash=password_hash,
        expires_at=expires_at,
        view_count="0",
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return _to_response(link)


def get_share_links(db: Session, presentation_id: str) -> list[ShareLinkResponse]:
    """Get all share links for a presentation."""
    links = db.query(ShareLink).filter_by(presentation_id=presentation_id).all()
    return [_to_response(link) for link in links]


def get_share_link(db: Session, link_id: str) -> ShareLinkResponse | None:
    """Get a share link by ID."""
    link = db.query(ShareLink).filter_by(id=link_id).first()
    if link:
        return _to_response(link)
    return None


def revoke_share_link(db: Session, link_id: str) -> bool:
    """Revoke (delete) a share link."""
    link = db.query(ShareLink).filter_by(id=link_id).first()
    if not link:
        return False
    db.delete(link)
    db.commit()
    return True


def access_shared_presentation(
    db: Session,
    token: str,
    password: str | None = None,
) -> SharedPresentationResponse | None:
    """Access a shared presentation via token."""
    link = db.query(ShareLink).filter_by(token=token).first()
    if not link:
        return None

    # Check expiration
    if link.expires_at and link.expires_at < datetime.now():
        return None

    # Check password if required
    if link.password_hash:
        if not password or not _verify_password(password, link.password_hash):
            raise PermissionError("Password required")

    # Increment view count
    current_count = int(link.view_count or "0")
    link.view_count = str(current_count + 1)
    db.commit()

    presentation = db.query(Presentation).filter_by(id=link.presentation_id).first()
    if not presentation:
        return None

    return SharedPresentationResponse(
        id=presentation.id,
        title=presentation.title,
        content=presentation.content,
        theme_id=presentation.theme_id,
        created_at=presentation.created_at,
        updated_at=presentation.updated_at,
    )


def get_share_info(db: Session, token: str) -> dict | None:
    """Get share link info without password check."""
    link = db.query(ShareLink).filter_by(token=token).first()
    if not link:
        return None

    # Check expiration
    if link.expires_at and link.expires_at < datetime.now():
        return {"error": "expired"}

    presentation = db.query(Presentation).filter_by(id=link.presentation_id).first()
    return {
        "title": presentation.title if presentation else "Presentation",
        "requires_password": bool(link.password_hash),
        "is_public": link.is_public,
    }
