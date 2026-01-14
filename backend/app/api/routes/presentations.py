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
from app.core.constants import get_export_format, get_valid_formats

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

def validate_batch_format(format: str) -> None:
    if not validate_export_format(format):
        valid_formats = ", ".join(get_valid_formats())
        raise HTTPException(400, f"Invalid format: {format}. Must be one of: {valid_formats}")

def process_batch_export(presentation_ids: list[str], format: str) -> list[BatchExportResult]:
    results = [export_single_presentation(pid, format) for pid in presentation_ids]
    success_count = sum(1 for r in results if r.status == "success")
    logger.info(f"Batch export completed: {success_count}/{len(results)} successful")
    return results

@router.post("/batch/export")
@limiter.limit("2/minute")
def batch_export(request: Request, data: BatchExportRequest) -> list[BatchExportResult]:
    validate_batch_format(data.format)
    logger.info(f"Batch export: {len(data.presentation_ids)} presentations to {data.format}")
    return process_batch_export(data.presentation_ids, data.format)

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

@router.post("/{presentation_id}/duplicate", response_model=PresentationResponse, status_code=201)
def duplicate_presentation(presentation_id: str) -> PresentationResponse:
    duplicated = service.duplicate_presentation(presentation_id)
    if not duplicated:
        raise HTTPException(404, "Presentation not found")
    return duplicated

def render_html_preview(pres: PresentationResponse) -> Response:
    try:
        html = marp_service.render_to_html(pres.content, pres.theme_id)
        return Response(content=html, media_type="text/html")
    except Exception as e:
        logger.error(f"Preview failed: {e}")
        raise HTTPException(500, f"Preview failed: {str(e)}")

@router.get("/{presentation_id}/preview")
def preview_presentation(presentation_id: str) -> Response:
    pres = service.get_presentation(presentation_id)
    if not pres:
        raise HTTPException(404, "Presentation not found")
    return render_html_preview(pres)

def export_to_format(pres: PresentationResponse, format: str) -> Path:
    format_info = get_export_format(format)
    if not format_info:
        raise ValueError(f"Unsupported format: {format}")
    output_path = EXPORTS_DIR / f"{pres.id}.{format}"
    marp_service.render_export(pres.content, output_path, format_info.marp_flag, format_info.display_name, pres.theme_id)
    return output_path

def validate_and_get_presentation(format: str, presentation_id: str) -> PresentationResponse:
    if not validate_export_format(format):
        valid_formats = ", ".join(get_valid_formats())
        raise HTTPException(400, f"Invalid format. Must be one of: {valid_formats}")
    pres = service.get_presentation(presentation_id)
    if not pres:
        raise HTTPException(404, "Presentation not found")
    return pres

def create_export_response(output_path: Path, title: str, format: str) -> FileResponse:
    safe_title = sanitize_filename(title)
    filename = f"{safe_title}.{format}"
    format_info = get_export_format(format)
    media_type = format_info.media_type if format_info else "application/octet-stream"
    return FileResponse(output_path, media_type=media_type, filename=filename)

@router.post("/{presentation_id}/export")
@limiter.limit("5/minute")
def export_presentation(request: Request, presentation_id: str, format: str = "pdf") -> FileResponse:
    pres = validate_and_get_presentation(format, presentation_id)
    try:
        output_path = export_to_format(pres, format)
        return create_export_response(output_path, pres.title, format)
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(500, f"Export failed: {str(e)}")
