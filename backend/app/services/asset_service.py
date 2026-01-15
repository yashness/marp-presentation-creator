"""Service for managing uploaded assets."""

import os
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from loguru import logger

from app.models.asset import Asset
from app.schemas.asset import AssetResponse


ASSETS_DIR = Path("data/assets")
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024


def save_asset(
    db: Session,
    file_content: bytes,
    original_filename: str,
    content_type: str
) -> AssetResponse | None:
    """Save uploaded asset to filesystem and database.

    Args:
        db: Database session
        file_content: File content bytes
        original_filename: Original filename
        content_type: MIME type

    Returns:
        Asset response or None if failed
    """
    try:
        ext = Path(original_filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            logger.error(f"Invalid file extension: {ext}")
            return None

        if len(file_content) > MAX_FILE_SIZE:
            logger.error(f"File too large: {len(file_content)} bytes")
            return None

        asset_id = str(uuid.uuid4())
        filename = f"{asset_id}{ext}"
        file_path = ASSETS_DIR / filename

        with open(file_path, "wb") as f:
            f.write(file_content)

        asset = Asset(
            id=asset_id,
            filename=filename,
            original_filename=original_filename,
            content_type=content_type,
            size_bytes=len(file_content)
        )

        db.add(asset)
        db.commit()
        db.refresh(asset)

        logger.info(f"Saved asset: {asset_id} ({original_filename})")

        return AssetResponse(
            id=asset.id,
            filename=asset.filename,
            original_filename=asset.original_filename,
            content_type=asset.content_type,
            size_bytes=asset.size_bytes,
            url=f"/api/assets/{asset.id}",
            created_at=asset.created_at
        )

    except Exception as e:
        logger.error(f"Failed to save asset: {e}")
        db.rollback()
        return None


def get_asset(db: Session, asset_id: str) -> Asset | None:
    """Get asset by ID.

    Args:
        db: Database session
        asset_id: Asset ID

    Returns:
        Asset or None
    """
    return db.query(Asset).filter(Asset.id == asset_id).first()


def get_asset_path(asset_id: str, filename: str) -> Path | None:
    """Get filesystem path for asset.

    Args:
        asset_id: Asset ID
        filename: Asset filename

    Returns:
        Path or None if not found
    """
    file_path = ASSETS_DIR / filename
    if file_path.exists():
        return file_path
    return None


def list_assets(db: Session, limit: int = 100) -> list[AssetResponse]:
    """List all assets.

    Args:
        db: Database session
        limit: Maximum number of assets to return

    Returns:
        List of asset responses
    """
    assets = db.query(Asset).order_by(Asset.created_at.desc()).limit(limit).all()

    return [
        AssetResponse(
            id=asset.id,
            filename=asset.filename,
            original_filename=asset.original_filename,
            content_type=asset.content_type,
            size_bytes=asset.size_bytes,
            url=f"/api/assets/{asset.id}",
            created_at=asset.created_at
        )
        for asset in assets
    ]


def delete_asset(db: Session, asset_id: str) -> bool:
    """Delete asset from filesystem and database.

    Args:
        db: Database session
        asset_id: Asset ID

    Returns:
        True if deleted, False otherwise
    """
    asset = get_asset(db, asset_id)
    if not asset:
        return False

    try:
        file_path = ASSETS_DIR / asset.filename
        if file_path.exists():
            os.remove(file_path)

        db.delete(asset)
        db.commit()

        logger.info(f"Deleted asset: {asset_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to delete asset: {e}")
        db.rollback()
        return False
