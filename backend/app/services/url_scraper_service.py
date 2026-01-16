"""URL scraping service for extracting content from links."""

import re
from typing import Optional
import httpx
from loguru import logger


def extract_text_from_html(html: str) -> str:
    """Extract readable text from HTML content."""
    # Remove script and style elements
    html = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', html, flags=re.IGNORECASE)
    html = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', html, flags=re.IGNORECASE)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', html)
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_title(html: str) -> Optional[str]:
    """Extract page title from HTML."""
    match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else None


def extract_meta_description(html: str) -> Optional[str]:
    """Extract meta description from HTML."""
    match = re.search(
        r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']',
        html, re.IGNORECASE
    )
    if not match:
        match = re.search(
            r'<meta[^>]*content=["\']([^"\']+)["\'][^>]*name=["\']description["\']',
            html, re.IGNORECASE
        )
    return match.group(1).strip() if match else None


def extract_og_data(html: str) -> dict:
    """Extract OpenGraph metadata from HTML."""
    og_data = {}
    for prop in ['title', 'description', 'type', 'site_name']:
        match = re.search(
            rf'<meta[^>]*property=["\']og:{prop}["\'][^>]*content=["\']([^"\']+)["\']',
            html, re.IGNORECASE
        )
        if not match:
            match = re.search(
                rf'<meta[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:{prop}["\']',
                html, re.IGNORECASE
            )
        if match:
            og_data[prop] = match.group(1).strip()
    return og_data


def extract_main_content(html: str) -> str:
    """Try to extract main content from common article/content tags."""
    # Look for common content containers
    for selector in ['<article[^>]*>([\s\S]*?)</article>',
                     '<main[^>]*>([\s\S]*?)</main>',
                     r'<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)</div>']:
        match = re.search(selector, html, re.IGNORECASE)
        if match:
            return extract_text_from_html(match.group(1))
    return ""


async def scrape_url(url: str, max_content_length: int = 10000) -> dict:
    """Scrape content from a URL.

    Returns structured data with title, description, and content.
    """
    if not url.startswith(('http://', 'https://')):
        url = f'https://{url}'

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; MarpBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            })
            response.raise_for_status()
            html = response.text

        title = extract_title(html)
        description = extract_meta_description(html)
        og_data = extract_og_data(html)
        main_content = extract_main_content(html)

        # Fall back to full text extraction if no main content found
        if not main_content:
            main_content = extract_text_from_html(html)

        # Truncate content
        if len(main_content) > max_content_length:
            main_content = main_content[:max_content_length] + "..."

        return {
            "success": True,
            "url": url,
            "title": og_data.get('title') or title or url,
            "description": og_data.get('description') or description or "",
            "content": main_content,
            "site_name": og_data.get('site_name', ''),
            "content_type": og_data.get('type', 'website'),
        }

    except httpx.TimeoutException:
        logger.warning(f"Timeout scraping URL: {url}")
        return {"success": False, "url": url, "error": "Request timeout"}
    except httpx.HTTPStatusError as e:
        logger.warning(f"HTTP error scraping URL {url}: {e.response.status_code}")
        return {"success": False, "url": url, "error": f"HTTP {e.response.status_code}"}
    except Exception as e:
        logger.error(f"Error scraping URL {url}: {e}")
        return {"success": False, "url": url, "error": str(e)}


def scrape_url_sync(url: str, max_content_length: int = 10000) -> dict:
    """Synchronous wrapper for scrape_url."""
    import asyncio
    return asyncio.run(scrape_url(url, max_content_length))
