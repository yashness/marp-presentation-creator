"""Presentation versioning service for undo/checkpointing."""

from datetime import datetime
import uuid
from sqlalchemy.orm import Session
from app.models.presentation import Presentation
from app.models.presentation_version import PresentationVersion
from app.core.database import get_db_session
from app.core.logger import logger

MAX_VERSIONS_PER_PRESENTATION = 50


def generate_id() -> str:
    return str(uuid.uuid4())


def create_version(
    presentation_id: str,
    checkpoint_name: str | None = None
) -> dict | None:
    """Create a new version/checkpoint of a presentation."""
    with get_db_session() as session:
        pres = session.query(Presentation).filter(
            Presentation.id == presentation_id
        ).first()
        if not pres:
            return None

        # Get next version number
        max_version = session.query(PresentationVersion).filter(
            PresentationVersion.presentation_id == presentation_id
        ).count()

        version = PresentationVersion(
            id=generate_id(),
            presentation_id=presentation_id,
            version_number=max_version + 1,
            title=pres.title,
            content=pres.content,
            theme_id=pres.theme_id,
            checkpoint_name=checkpoint_name,
            created_at=datetime.now()
        )
        session.add(version)
        session.flush()

        # Cleanup old versions if over limit
        _cleanup_old_versions(session, presentation_id)

        session.refresh(version)
        logger.info(f"Created version {version.version_number} for {presentation_id}")
        return _to_dict(version)


def list_versions(presentation_id: str) -> list[dict]:
    """List all versions of a presentation."""
    with get_db_session() as session:
        versions = session.query(PresentationVersion).filter(
            PresentationVersion.presentation_id == presentation_id
        ).order_by(PresentationVersion.version_number.desc()).all()
        return [_to_dict(v) for v in versions]


def get_version(version_id: str) -> dict | None:
    """Get a specific version."""
    with get_db_session() as session:
        version = session.query(PresentationVersion).filter(
            PresentationVersion.id == version_id
        ).first()
        return _to_dict(version) if version else None


def restore_version(version_id: str) -> dict | None:
    """Restore a presentation to a specific version."""
    with get_db_session() as session:
        version = session.query(PresentationVersion).filter(
            PresentationVersion.id == version_id
        ).first()
        if not version:
            return None

        pres = session.query(Presentation).filter(
            Presentation.id == version.presentation_id
        ).first()
        if not pres:
            return None

        # Save current state as a new version before restoring
        max_version = session.query(PresentationVersion).filter(
            PresentationVersion.presentation_id == version.presentation_id
        ).count()

        backup = PresentationVersion(
            id=generate_id(),
            presentation_id=pres.id,
            version_number=max_version + 1,
            title=pres.title,
            content=pres.content,
            theme_id=pres.theme_id,
            checkpoint_name=f"Before restore to v{version.version_number}",
            created_at=datetime.now()
        )
        session.add(backup)

        # Restore the version
        pres.title = version.title
        pres.content = version.content
        pres.theme_id = version.theme_id
        pres.updated_at = datetime.now()

        session.flush()
        session.refresh(pres)

        logger.info(f"Restored {pres.id} to version {version.version_number}")
        return {
            "id": pres.id,
            "title": pres.title,
            "content": pres.content,
            "theme_id": pres.theme_id,
            "restored_from": version.version_number
        }


def delete_version(version_id: str) -> bool:
    """Delete a specific version."""
    with get_db_session() as session:
        version = session.query(PresentationVersion).filter(
            PresentationVersion.id == version_id
        ).first()
        if not version:
            return False
        session.delete(version)
        logger.info(f"Deleted version: {version_id}")
        return True


def _cleanup_old_versions(session: Session, presentation_id: str) -> None:
    """Remove oldest versions if over limit."""
    versions = session.query(PresentationVersion).filter(
        PresentationVersion.presentation_id == presentation_id
    ).order_by(PresentationVersion.version_number.desc()).all()

    if len(versions) > MAX_VERSIONS_PER_PRESENTATION:
        for v in versions[MAX_VERSIONS_PER_PRESENTATION:]:
            session.delete(v)
        logger.info(f"Cleaned up old versions for {presentation_id}")


def _to_dict(version: PresentationVersion) -> dict:
    return {
        "id": version.id,
        "presentation_id": version.presentation_id,
        "version_number": version.version_number,
        "title": version.title,
        "content": version.content,
        "theme_id": version.theme_id,
        "checkpoint_name": version.checkpoint_name,
        "created_at": version.created_at.isoformat(),
    }
