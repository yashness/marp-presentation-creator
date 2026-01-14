from pydantic import BaseModel, Field

class BatchExportRequest(BaseModel):
    presentation_ids: list[str] = Field(min_length=1, max_length=10)
    format: str = Field(pattern="^(pdf|html|pptx)$")

class BatchExportResult(BaseModel):
    presentation_id: str
    status: str
    file_path: str | None = None
    error: str | None = None
