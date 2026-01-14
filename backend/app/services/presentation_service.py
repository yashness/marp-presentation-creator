from pathlib import Path
from datetime import datetime
from typing import Any
import uuid
import json
from app.schemas.presentation import PresentationCreate, PresentationResponse, PresentationUpdate
from app.core.logger import logger

STORAGE_DIR = Path("data/presentations")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def generate_id() -> str:
    return str(uuid.uuid4())

def validate_presentation_id(pres_id: str) -> None:
    if "/" in pres_id or "\\" in pres_id or ".." in pres_id:
        raise ValueError("Invalid presentation ID")

def get_presentation_path(pres_id: str) -> Path:
    validate_presentation_id(pres_id)
    return STORAGE_DIR / f"{pres_id}.md"

def get_metadata_path(pres_id: str) -> Path:
    validate_presentation_id(pres_id)
    return STORAGE_DIR / f"{pres_id}.json"

def save_presentation_file(pres_id: str, content: str) -> None:
    path = get_presentation_path(pres_id)
    path.write_text(content)

def save_metadata(pres_id: str, metadata: dict[str, Any]) -> None:
    path = get_metadata_path(pres_id)
    path.write_text(json.dumps(metadata, default=str))

def load_metadata(pres_id: str) -> dict[str, Any]:
    path = get_metadata_path(pres_id)
    data: dict[str, Any] = json.loads(path.read_text())
    return data

def load_presentation_content(pres_id: str) -> str:
    path = get_presentation_path(pres_id)
    return path.read_text()

def build_metadata(pres_id: str, title: str, theme_id: str | None, now: datetime) -> dict[str, Any]:
    return {
        "id": pres_id,
        "title": title,
        "theme_id": theme_id,
        "created_at": now,
        "updated_at": now
    }

def create_presentation(data: PresentationCreate) -> PresentationResponse:
    pres_id = generate_id()
    now = datetime.now()
    save_presentation_file(pres_id, data.content)
    metadata = build_metadata(pres_id, data.title, data.theme_id, now)
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

def search_presentations(query: str, theme_id: str | None = None) -> list[PresentationResponse]:
    all_presentations = list_presentations()
    filtered = filter_by_query_and_theme(all_presentations, query, theme_id)
    return filtered

def filter_by_query_and_theme(presentations: list[PresentationResponse], query: str, theme_id: str | None) -> list[PresentationResponse]:
    results = []
    for pres in presentations:
        if matches_filters(pres, query, theme_id):
            results.append(pres)
    return results

def matches_filters(pres: PresentationResponse, query: str, theme_id: str | None) -> bool:
    query_match = query.lower() in pres.title.lower() or query.lower() in pres.content.lower()
    theme_match = theme_id is None or pres.theme_id == theme_id
    return query_match and theme_match

def apply_updates_to_metadata(metadata: dict[str, Any], data: PresentationUpdate) -> dict[str, Any]:
    if data.title:
        metadata["title"] = data.title
    if data.theme_id:
        metadata["theme_id"] = data.theme_id
    metadata["updated_at"] = datetime.now()
    return metadata

def get_updated_content(pres_id: str, new_content: str | None) -> str:
    return new_content or load_presentation_content(pres_id)

def update_presentation(pres_id: str, data: PresentationUpdate) -> PresentationResponse | None:
    pres = get_presentation(pres_id)
    if not pres:
        return None
    if data.content:
        save_presentation_file(pres_id, data.content)
    metadata = apply_updates_to_metadata(load_metadata(pres_id), data)
    save_metadata(pres_id, metadata)
    logger.info(f"Updated presentation: {pres_id}")
    content = get_updated_content(pres_id, data.content)
    return PresentationResponse(**metadata, content=content)

def delete_presentation(pres_id: str) -> bool:
    try:
        get_presentation_path(pres_id).unlink()
        get_metadata_path(pres_id).unlink()
        logger.info(f"Deleted presentation: {pres_id}")
        return True
    except FileNotFoundError:
        return False
