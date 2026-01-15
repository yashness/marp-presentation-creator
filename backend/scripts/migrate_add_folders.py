"""Migration script to add folders table and update presentations table."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from app.core.logger import logger

def run_migration():
    """Run migration to add folders table and folder_id to presentations."""
    db_dir = Path("data/db")
    db_dir.mkdir(parents=True, exist_ok=True)
    db_path = db_dir / "presentations.db"

    engine = create_engine(f"sqlite:///{db_path}")

    logger.info("Starting migration: adding folders table")

    with engine.connect() as conn:
        # Check if folders table exists
        result = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='folders'"
        ))
        if result.fetchone():
            logger.info("Folders table already exists, skipping creation")
        else:
            # Create folders table
            conn.execute(text("""
                CREATE TABLE folders (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    parent_id VARCHAR(36),
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    FOREIGN KEY(parent_id) REFERENCES folders (id)
                )
            """))
            logger.info("Created folders table")

        # Check if folder_id column exists in presentations
        result = conn.execute(text("PRAGMA table_info(presentations)"))
        columns = [row[1] for row in result.fetchall()]

        if "folder_id" in columns:
            logger.info("folder_id column already exists in presentations table")
        else:
            # Add folder_id column to presentations
            conn.execute(text("""
                ALTER TABLE presentations ADD COLUMN folder_id VARCHAR(36)
            """))
            logger.info("Added folder_id column to presentations table")

        conn.commit()

    logger.info("Migration completed successfully")

if __name__ == "__main__":
    run_migration()
