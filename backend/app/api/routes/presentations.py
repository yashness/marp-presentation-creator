from fastapi import APIRouter, HTTPException, Response
from app.schemas.presentation import PresentationCreate, PresentationResponse, PresentationUpdate
from app.services import presentation_service as service
from app.services import marp_service
from app.core.logger import logger

router = APIRouter(prefix="/presentations", tags=["presentations"])

@router.post("", response_model=PresentationResponse)
def create_presentation(data: PresentationCreate):
    logger.info(f"Creating presentation: {data.title}")
    return service.create_presentation(data)

@router.get("", response_model=list[PresentationResponse])
def list_presentations():
    return service.list_presentations()

@router.get("/{presentation_id}", response_model=PresentationResponse)
def get_presentation(presentation_id: str):
    pres = service.get_presentation(presentation_id)
    if not pres:
        raise HTTPException(404, "Presentation not found")
    return pres

@router.put("/{presentation_id}", response_model=PresentationResponse)
def update_presentation(presentation_id: str, data: PresentationUpdate):
    pres = service.update_presentation(presentation_id, data)
    if not pres:
        raise HTTPException(404, "Presentation not found")
    return pres

@router.delete("/{presentation_id}")
def delete_presentation(presentation_id: str):
    success = service.delete_presentation(presentation_id)
    if not success:
        raise HTTPException(404, "Presentation not found")
    return {"message": "Presentation deleted"}

@router.get("/{presentation_id}/preview")
def preview_presentation(presentation_id: str):
    pres = service.get_presentation(presentation_id)
    if not pres:
        raise HTTPException(404, "Presentation not found")

    try:
        html = marp_service.render_to_html(pres.content, pres.theme_id)
        return Response(content=html, media_type="text/html")
    except Exception as e:
        logger.error(f"Preview failed: {e}")
        raise HTTPException(500, f"Preview failed: {str(e)}")
