"""Presentation service with database persistence."""

from datetime import datetime
import uuid
from contextlib import contextmanager
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.presentation import Presentation
from app.schemas.presentation import PresentationCreate, PresentationResponse, PresentationUpdate
from app.core.database import SessionLocal
from app.core.logger import logger

def generate_id() -> str:
    return str(uuid.uuid4())

@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def to_response(pres: Presentation) -> PresentationResponse:
    return PresentationResponse(
        id=pres.id,
        title=pres.title,
        content=pres.content,
        theme_id=pres.theme_id,
        created_at=pres.created_at,
        updated_at=pres.updated_at
    )

def create_db_presentation(session: Session, data: PresentationCreate) -> Presentation:
    pres = Presentation(
        id=generate_id(),
        title=data.title,
        content=data.content,
        theme_id=data.theme_id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    session.add(pres)
    session.flush()
    session.refresh(pres)
    return pres

def create_presentation(data: PresentationCreate) -> PresentationResponse:
    with get_session() as session:
        pres = create_db_presentation(session, data)
        logger.info(f"Created presentation: {pres.id}")
        return to_response(pres)

def get_presentation(pres_id: str) -> PresentationResponse | None:
    with get_session() as session:
        pres = session.query(Presentation).filter(Presentation.id == pres_id).first()
        return to_response(pres) if pres else None

def list_presentations() -> list[PresentationResponse]:
    with get_session() as session:
        presentations = session.query(Presentation).all()
        return [to_response(p) for p in presentations]

def build_search_filters(session: Session, query: str, theme_id: str | None):
    q = session.query(Presentation)
    q = q.filter(or_(Presentation.title.contains(query), Presentation.content.contains(query)))
    if theme_id:
        q = q.filter(Presentation.theme_id == theme_id)
    return q

def search_presentations(query: str, theme_id: str | None = None) -> list[PresentationResponse]:
    with get_session() as session:
        q = build_search_filters(session, query, theme_id)
        return [to_response(p) for p in q.all()]

def apply_updates(pres: Presentation, data: PresentationUpdate) -> None:
    if data.title:
        pres.title = data.title
    if data.content:
        pres.content = data.content
    if data.theme_id:
        pres.theme_id = data.theme_id
    pres.updated_at = datetime.now()

def update_presentation(pres_id: str, data: PresentationUpdate) -> PresentationResponse | None:
    with get_session() as session:
        pres = session.query(Presentation).filter(Presentation.id == pres_id).first()
        if not pres:
            return None
        apply_updates(pres, data)
        session.flush()
        session.refresh(pres)
        logger.info(f"Updated presentation: {pres_id}")
        return to_response(pres)

def delete_presentation(pres_id: str) -> bool:
    with get_session() as session:
        pres = session.query(Presentation).filter(Presentation.id == pres_id).first()
        if not pres:
            return False
        session.delete(pres)
        logger.info(f"Deleted presentation: {pres_id}")
        return True
