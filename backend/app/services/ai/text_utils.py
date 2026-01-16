"""Text sanitization and parsing utilities."""

import json
import re
from typing import Optional
from loguru import logger


# Pre-compiled regex patterns
JSON_FENCE_PATTERN = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
MD_FENCE_PATTERN = re.compile(r"^```(?:markdown|md)?\s*([\s\S]*?)\s*```$", re.IGNORECASE)


def extract_json(raw: str) -> Optional[dict]:
    """Extract JSON from AI response, handling code fences."""
    if not raw:
        return None
    cleaned = raw.strip()

    # Try raw_decode first
    try:
        parsed, _ = json.JSONDecoder().raw_decode(cleaned)
        return parsed
    except json.JSONDecodeError:
        pass

    # Try extracting from code fence
    fenced = JSON_FENCE_PATTERN.search(cleaned)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    # Last resort: direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error(f"JSON parse failed. First 300 chars: {cleaned[:300]}")
        return None


def extract_json_array(raw: str) -> Optional[list]:
    """Extract JSON array from AI response."""
    if not raw:
        return None
    cleaned = raw.strip()

    # Remove code fences if present
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        result = json.loads(cleaned)
        return result if isinstance(result, list) else None
    except json.JSONDecodeError:
        logger.error("Failed to parse JSON array")
        return None


def strip_code_fence(text: str) -> str:
    """Remove markdown code fences from text."""
    if not text:
        return text
    match = MD_FENCE_PATTERN.match(text.strip())
    return match.group(1).strip() if match else text.strip()


def strip_frontmatter(text: str) -> str:
    """Remove YAML frontmatter from markdown."""
    if not text:
        return text
    return re.sub(r"^---\s*[\s\S]*?---\s*", "", text.strip())


def sanitize_markdown(text: str) -> str:
    """Clean AI-generated markdown content."""
    cleaned = strip_code_fence(text or "")
    cleaned = strip_frontmatter(cleaned)
    return cleaned.strip()


def fix_broken_comments(text: str) -> str:
    """Fix malformed HTML comment blocks."""
    text = re.sub(r"<!--\s*<!--", "<!--", text)
    text = re.sub(r"-->\s*-->", "-->", text)
    if text.count("<!--") > text.count("-->"):
        text = text + "\n-->"
    text = re.sub(r"<!--\s*\n\s*-->", "", text)
    return text


def parse_slide_blocks(content: str) -> list[str]:
    """Parse slide content into individual blocks."""
    if not content:
        return []
    blocks = re.split(r"\n---\s*\n", content)
    return [b.strip() for b in blocks if b.strip()]


def format_for_audio(text: str) -> str:
    """Format text for TTS output (no markdown, clean speech)."""
    if not text:
        return ""

    # Remove markdown formatting
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[-*]\s*", "", text, flags=re.MULTILINE)

    # Clean NARRATION prefix
    text = re.sub(r"^(?:NARRATION|Narration):\s*", "", text, flags=re.IGNORECASE)

    return text.strip()
