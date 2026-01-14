from fastapi import APIRouter, HTTPException, Response, Request
from fastapi.responses import FileResponse
from pathlib import Path
from app.schemas.presentation import PresentationCreate, PresentationResponse, PresentationUpdate
from app.schemas.batch import BatchExportRequest, BatchExportResult
from app.services import presentation_service as service
from app.services import marp_service
from app.core.logger import logger
from app.core.validators import validate_export_format, sanitize_filename
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/presentations", tags=["presentations"])
EXPORTS_DIR = Path("data/exports")
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

@router.post("", response_model=PresentationResponse)
@limiter.limit("10/minute")
def create_presentation(request: Request, data: PresentationCreate) -> PresentationResponse:
    logger.info(f"Creating presentation: {data.title}")
    return service.create_presentation(data)

@router.get("", response_model=list[PresentationResponse])
def list_presentations(query: str | None = None, theme_id: str | None = None) -> list[PresentationResponse]:
    if query:
        return service.search_presentations(query, theme_id)
    return service.list_presentations()

def export_single_presentation(pres_id: str, format: str) -> BatchExportResult:
    try:
        pres = service.get_presentation(pres_id)
        if not pres:
            return BatchExportResult(presentation_id=pres_id, status="error", error="Not found")
        output_path = export_to_format(pres, format)
        return BatchExportResult(presentation_id=pres_id, status="success", file_path=str(output_path))
    except Exception as e:
        return BatchExportResult(presentation_id=pres_id, status="error", error=str(e))

@router.post("/batch/export")
@limiter.limit("2/minute")
def batch_export(request: Request, data: BatchExportRequest) -> list[BatchExportResult]:
    logger.info(f"Batch export: {len(data.presentation_ids)} presentations to {data.format}")
    results = [export_single_presentation(pid, data.format) for pid in data.presentation_ids]
    return results

@router.get("/{presentation_id}", response_model=PresentationResponse)
def get_presentation(presentation_id: str) -> PresentationResponse:
    pres = service.get_presentation(presentation_id)
    if not pres:
        raise HTTPException(404, "Presentation not found")
    return pres

@router.put("/{presentation_id}", response_model=PresentationResponse)
def update_presentation(presentation_id: str, data: PresentationUpdate) -> PresentationResponse:
    pres = service.update_presentation(presentation_id, data)
    if not pres:
        raise HTTPException(404, "Presentation not found")
    return pres

@router.delete("/{presentation_id}")
def delete_presentation(presentation_id: str) -> dict[str, str]:
    success = service.delete_presentation(presentation_id)
    if not success:
        raise HTTPException(404, "Presentation not found")
    return {"message": "Presentation deleted"}

def get_validated_presentation(presentation_id: str) -> PresentationResponse:
    pres = service.get_presentation(presentation_id)
    if not pres:
        raise HTTPException(404, "Presentation not found")
    return pres

def render_html_response(pres: PresentationResponse) -> Response:
    try:
        html = marp_service.render_to_html(pres.content, pres.theme_id)
        return Response(content=html, media_type="text/html")
    except Exception as e:
        logger.error(f"Preview failed: {e}")
        raise HTTPException(500, f"Preview failed: {str(e)}")

@router.get("/{presentation_id}/preview")
def preview_presentation(presentation_id: str) -> Response:
    pres = get_validated_presentation(presentation_id)
    return render_html_response(pres)

def get_export_path(pres_id: str, format: str) -> Path:
    return EXPORTS_DIR / f"{pres_id}.{format}"

def get_media_type(format: str) -> str:
    media_types = {
        "pdf": "application/pdf",
        "html": "text/html",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    }
    return media_types.get(format, "application/octet-stream")

def export_to_format(pres: PresentationResponse, format: str) -> Path:
    output_path = get_export_path(pres.id, format)
    if format == "pdf":
        marp_service.render_to_pdf(pres.content, output_path, pres.theme_id)
    elif format == "html":
        marp_service.render_to_html_file(pres.content, output_path, pres.theme_id)
    elif format == "pptx":
        marp_service.render_to_pptx(pres.content, output_path, pres.theme_id)
    return output_path

def validate_format_and_presentation(format: str, presentation_id: str) -> PresentationResponse:
    if not validate_export_format(format):
        raise HTTPException(400, f"Invalid format. Must be one of: pdf, html, pptx")
    pres = service.get_presentation(presentation_id)
    if not pres:
        raise HTTPException(404, "Presentation not found")
    return pres

def create_file_response(output_path: Path, pres_title: str, format: str) -> FileResponse:
    safe_title = sanitize_filename(pres_title)
    filename = f"{safe_title}.{format}"
    return FileResponse(output_path, media_type=get_media_type(format), filename=filename)

@router.post("/{presentation_id}/export")
@limiter.limit("5/minute")
def export_presentation(request: Request, presentation_id: str, format: str = "pdf") -> FileResponse:
    pres = validate_format_and_presentation(format, presentation_id)
    try:
        output_path = export_to_format(pres, format)
        return create_file_response(output_path, pres.title, format)
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(500, f"Export failed: {str(e)}")
