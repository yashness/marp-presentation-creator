"""Folder service with database persistence."""

from datetime import datetime
import uuid
from sqlalchemy.orm import Session
from app.models.folder import Folder
from app.schemas.folder import FolderCreate, FolderResponse, FolderUpdate
from app.core.database import get_db_session
from app.core.logger import logger
from app.core.validators import is_safe_filename

def generate_id() -> str:
    return str(uuid.uuid4())

def validate_folder_id(folder_id: str) -> None:
    if not is_safe_filename(folder_id):
        raise ValueError("Invalid folder ID")

def to_response(folder: Folder) -> FolderResponse:
    return FolderResponse(
        id=folder.id,
        name=folder.name,
        parent_id=folder.parent_id,
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )

def build_folder(data: FolderCreate) -> Folder:
    now = datetime.now()
    return Folder(
        id=generate_id(),
        name=data.name,
        parent_id=data.parent_id,
        created_at=now,
        updated_at=now
    )

def persist_folder(session: Session, folder: Folder) -> Folder:
    session.add(folder)
    session.flush()
    session.refresh(folder)
    return folder

def create_db_folder(session: Session, data: FolderCreate) -> Folder:
    if data.parent_id:
        parent = session.query(Folder).filter(Folder.id == data.parent_id).first()
        if not parent:
            raise ValueError(f"Parent folder {data.parent_id} not found")
    folder = build_folder(data)
    return persist_folder(session, folder)

def get_folder_by_id(session: Session, folder_id: str) -> Folder | None:
    return session.query(Folder).filter(Folder.id == folder_id).first()

def create_folder(data: FolderCreate) -> FolderResponse:
    with get_db_session() as session:
        folder = create_db_folder(session, data)
        logger.info(f"Created folder: {folder.id}")
        return to_response(folder)

def get_folder(folder_id: str) -> FolderResponse | None:
    with get_db_session() as session:
        folder = get_folder_by_id(session, folder_id)
        return to_response(folder) if folder else None

def list_folders(parent_id: str | None = None) -> list[FolderResponse]:
    with get_db_session() as session:
        query = session.query(Folder)
        if parent_id is not None:
            query = query.filter(Folder.parent_id == parent_id)
        else:
            query = query.filter(Folder.parent_id.is_(None))
        folders = query.all()
        return [to_response(f) for f in folders]

def list_all_folders() -> list[FolderResponse]:
    with get_db_session() as session:
        folders = session.query(Folder).all()
        return [to_response(f) for f in folders]

def apply_updates(folder: Folder, data: FolderUpdate) -> None:
    if data.name:
        folder.name = data.name
    if data.parent_id is not None:
        folder.parent_id = data.parent_id
    folder.updated_at = datetime.now()

def update_folder(folder_id: str, data: FolderUpdate) -> FolderResponse | None:
    with get_db_session() as session:
        folder = get_folder_by_id(session, folder_id)
        if not folder:
            return None
        if data.parent_id and data.parent_id == folder_id:
            raise ValueError("Folder cannot be its own parent")
        if data.parent_id:
            parent = session.query(Folder).filter(Folder.id == data.parent_id).first()
            if not parent:
                raise ValueError(f"Parent folder {data.parent_id} not found")
        apply_updates(folder, data)
        session.flush()
        session.refresh(folder)
        logger.info(f"Updated folder: {folder_id}")
        return to_response(folder)

def delete_folder(folder_id: str) -> bool:
    with get_db_session() as session:
        folder = get_folder_by_id(session, folder_id)
        if not folder:
            return False

        # Check if folder has children
        children = session.query(Folder).filter(Folder.parent_id == folder_id).count()
        if children > 0:
            raise ValueError("Cannot delete folder with subfolders")

        # Check if folder has presentations
        if folder.presentations:
            raise ValueError("Cannot delete folder with presentations")

        session.delete(folder)
        logger.info(f"Deleted folder: {folder_id}")
        return True
