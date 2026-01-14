"""Database configuration and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from pathlib import Path
from app.core.logger import logger

DB_DIR = Path("data/db")
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "presentations.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def init_db() -> None:
    from app.models.presentation import Base
    logger.info(f"Initializing database at {DB_PATH}")
    Base.metadata.create_all(bind=engine)

def get_db() -> Session:
    return SessionLocal()
