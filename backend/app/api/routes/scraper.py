"""URL scraping routes for extracting content from links."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, HttpUrl
from app.services.url_scraper_service import scrape_url
from app.core.logger import logger

router = APIRouter(prefix="/scraper", tags=["scraper"])


class ScrapeRequest(BaseModel):
    """URL scrape request."""
    url: str = Field(..., description="URL to scrape")
    max_content_length: int = Field(default=10000, ge=100, le=50000)


class ScrapeResponse(BaseModel):
    """URL scrape response."""
    success: bool
    url: str
    title: str | None = None
    description: str | None = None
    content: str | None = None
    site_name: str | None = None
    content_type: str | None = None
    error: str | None = None


@router.post("", response_model=ScrapeResponse)
async def scrape_url_endpoint(request: ScrapeRequest) -> ScrapeResponse:
    """Scrape content from a URL for use as context."""
    logger.info(f"Scraping URL: {request.url}")
    result = await scrape_url(request.url, request.max_content_length)
    return ScrapeResponse(**result)


@router.post("/batch")
async def scrape_urls_batch(urls: list[str]) -> list[ScrapeResponse]:
    """Scrape multiple URLs in batch."""
    if len(urls) > 10:
        raise HTTPException(400, "Maximum 10 URLs per batch")

    results = []
    for url in urls:
        result = await scrape_url(url)
        results.append(ScrapeResponse(**result))

    return results
