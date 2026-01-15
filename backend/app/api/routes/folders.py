from fastapi import APIRouter, HTTPException, Request
from app.schemas.folder import FolderCreate, FolderResponse, FolderUpdate
from app.services import folder_service as service
from app.core.logger import logger
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/folders", tags=["folders"])

@router.post("", response_model=FolderResponse)
@limiter.limit("10/minute")
def create_folder(request: Request, data: FolderCreate) -> FolderResponse:
    logger.info(f"Creating folder: {data.name}")
    try:
        return service.create_folder(data)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("", response_model=list[FolderResponse])
def list_folders(parent_id: str | None = None, all: bool = False) -> list[FolderResponse]:
    if all:
        return service.list_all_folders()
    return service.list_folders(parent_id)

@router.get("/{folder_id}", response_model=FolderResponse)
def get_folder(folder_id: str) -> FolderResponse:
    folder = service.get_folder(folder_id)
    if not folder:
        raise HTTPException(404, "Folder not found")
    return folder

@router.put("/{folder_id}", response_model=FolderResponse)
def update_folder(folder_id: str, data: FolderUpdate) -> FolderResponse:
    try:
        folder = service.update_folder(folder_id, data)
        if not folder:
            raise HTTPException(404, "Folder not found")
        return folder
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/{folder_id}")
def delete_folder(folder_id: str) -> dict[str, str]:
    try:
        success = service.delete_folder(folder_id)
        if not success:
            raise HTTPException(404, "Folder not found")
        return {"message": "Folder deleted"}
    except ValueError as e:
        raise HTTPException(400, str(e))
