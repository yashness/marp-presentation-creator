"""API routes for asset management."""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.schemas.asset import AssetResponse
from app.services import asset_service
from app.core.database import get_db
from app.core.logger import logger

router = APIRouter(prefix="/assets", tags=["assets"])


def get_session() -> Session:
    """Get database session."""
    db = get_db()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=AssetResponse, status_code=201)
async def upload_asset(
    file: UploadFile = File(...),
    db: Session = Depends(get_session)
) -> AssetResponse:
    """Upload an asset file (logo, image, etc).

    Args:
        file: Uploaded file
        db: Database session

    Returns:
        Asset response with URL
    """
    logger.info(f"Uploading asset: {file.filename}")

    try:
        content = await file.read()

        asset = asset_service.save_asset(
            db=db,
            file_content=content,
            original_filename=file.filename or "unknown",
            content_type=file.content_type or "application/octet-stream"
        )

        if not asset:
            raise HTTPException(400, "Failed to save asset")

        return asset

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload asset: {e}")
        raise HTTPException(500, f"Failed to upload asset: {str(e)}")


@router.get("", response_model=list[AssetResponse])
def list_assets(db: Session = Depends(get_session)) -> list[AssetResponse]:
    """List all uploaded assets.

    Args:
        db: Database session

    Returns:
        List of assets
    """
    logger.info("Listing assets")
    return asset_service.list_assets(db)


@router.get("/{asset_id}")
def get_asset(asset_id: str, db: Session = Depends(get_session)) -> FileResponse:
    """Get asset file by ID.

    Args:
        asset_id: Asset ID
        db: Database session

    Returns:
        Asset file
    """
    logger.info(f"Fetching asset: {asset_id}")

    asset = asset_service.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(404, f"Asset {asset_id} not found")

    file_path = asset_service.get_asset_path(asset_id, asset.filename)
    if not file_path:
        raise HTTPException(404, f"Asset file not found")

    return FileResponse(
        path=file_path,
        media_type=asset.content_type,
        filename=asset.original_filename
    )


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: str, db: Session = Depends(get_session)) -> None:
    """Delete an asset.

    Args:
        asset_id: Asset ID
        db: Database session
    """
    logger.info(f"Deleting asset: {asset_id}")

    success = asset_service.delete_asset(db, asset_id)
    if not success:
        raise HTTPException(404, f"Asset {asset_id} not found")
