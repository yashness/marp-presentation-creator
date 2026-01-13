from pathlib import Path
from datetime import datetime
import uuid
import json
from app.schemas.presentation import PresentationCreate, PresentationResponse, PresentationUpdate
from app.core.logger import logger

STORAGE_DIR = Path("data/presentations")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def generate_id() -> str:
    return str(uuid.uuid4())

def get_presentation_path(pres_id: str) -> Path:
    return STORAGE_DIR / f"{pres_id}.md"

def get_metadata_path(pres_id: str) -> Path:
    return STORAGE_DIR / f"{pres_id}.json"

def save_presentation_file(pres_id: str, content: str):
    path = get_presentation_path(pres_id)
    path.write_text(content)

def save_metadata(pres_id: str, metadata: dict):
    path = get_metadata_path(pres_id)
    path.write_text(json.dumps(metadata, default=str))

def load_metadata(pres_id: str) -> dict:
    path = get_metadata_path(pres_id)
    return json.loads(path.read_text())

def load_presentation_content(pres_id: str) -> str:
    path = get_presentation_path(pres_id)
    return path.read_text()

def create_presentation(data: PresentationCreate) -> PresentationResponse:
    pres_id = generate_id()
    now = datetime.now()

    save_presentation_file(pres_id, data.content)
    metadata = {
        "id": pres_id,
        "title": data.title,
        "theme_id": data.theme_id,
        "created_at": now,
        "updated_at": now
    }
    save_metadata(pres_id, metadata)
    logger.info(f"Created presentation: {pres_id}")

    return PresentationResponse(**metadata, content=data.content)

def get_presentation(pres_id: str) -> PresentationResponse | None:
    try:
        metadata = load_metadata(pres_id)
        content = load_presentation_content(pres_id)
        return PresentationResponse(**metadata, content=content)
    except FileNotFoundError:
        return None

def list_presentations() -> list[PresentationResponse]:
    presentations = []
    for meta_file in STORAGE_DIR.glob("*.json"):
        pres_id = meta_file.stem
        pres = get_presentation(pres_id)
        if pres:
            presentations.append(pres)
    return presentations

def update_presentation(pres_id: str, data: PresentationUpdate) -> PresentationResponse | None:
    pres = get_presentation(pres_id)
    if not pres:
        return None

    if data.content:
        save_presentation_file(pres_id, data.content)

    metadata = load_metadata(pres_id)
    if data.title:
        metadata["title"] = data.title
    if data.theme_id:
        metadata["theme_id"] = data.theme_id
    metadata["updated_at"] = datetime.now()

    save_metadata(pres_id, metadata)
    logger.info(f"Updated presentation: {pres_id}")

    content = data.content or load_presentation_content(pres_id)
    return PresentationResponse(**metadata, content=content)

def delete_presentation(pres_id: str) -> bool:
    try:
        get_presentation_path(pres_id).unlink()
        get_metadata_path(pres_id).unlink()
        logger.info(f"Deleted presentation: {pres_id}")
        return True
    except FileNotFoundError:
        return False
