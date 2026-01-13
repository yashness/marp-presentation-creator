from fastapi import APIRouter, HTTPException
from app.schemas.theme import ThemeResponse
from app.services import theme_service
from app.core.logger import logger

router = APIRouter(prefix="/themes", tags=["themes"])

@router.get("", response_model=list[ThemeResponse])
def list_themes() -> list[ThemeResponse]:
    logger.info("Listing all themes")
    return theme_service.list_builtin_themes()

@router.get("/{theme_id}", response_model=ThemeResponse)
def get_theme(theme_id: str) -> ThemeResponse:
    try:
        return theme_service.get_builtin_theme(theme_id)
    except FileNotFoundError:
        raise HTTPException(404, f"Theme {theme_id} not found")
