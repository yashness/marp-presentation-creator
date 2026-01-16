"""Outline generation with batching for large presentations."""

from typing import Optional
from loguru import logger

from .client import AIClient
from .models import SlideOutline, PresentationOutline
from .text_utils import extract_json


class OutlineGenerator:
    """Generate presentation outlines with intelligent batching."""

    def __init__(self, client: AIClient):
        self.client = client
        self.batch_size = 8

    def generate(
        self,
        description: str,
        slide_count: Optional[int] = None,
        audience: Optional[str] = None,
        flavor: Optional[str] = None,
        narration_instructions: Optional[str] = None,
        comment_max_ratio: Optional[float] = None
    ) -> Optional[PresentationOutline]:
        """Generate outline, batching for large presentations."""
        if not self.client.is_available:
            logger.error("AI client not available")
            return None

        target = slide_count or 8
        constraints = self._build_constraints(target, audience, flavor)

        # Use batched generation for large presentations
        if target > 15:
            return self._generate_batched(description, target, constraints, narration_instructions)

        return self._generate_single(description, target, constraints, narration_instructions, comment_max_ratio)

    def _build_constraints(
        self,
        slide_count: int,
        audience: Optional[str],
        flavor: Optional[str]
    ) -> str:
        """Build constraint text for prompt."""
        lines = [f"- Target slides: {slide_count}"]
        if audience:
            lines.append(f"- Audience: {audience}")
        if flavor:
            lines.append(f"- Style: {flavor}")
        return "\n".join(lines)

    def _create_prompt(self, description: str, constraints: str, slide_hint: str, context: str = "") -> str:
        """Create outline generation prompt."""
        return f"""Create a presentation outline.

Topic: {description}
{context}

Constraints:
{constraints}

Generate:
1. A compelling title
2. {slide_hint} with clear, specific titles

Return JSON only:
{{
    "title": "Presentation Title",
    "slides": [
        {{"title": "Descriptive Title", "content_points": ["Point 1", "Point 2"], "notes": ""}}
    ]
}}

Rules:
- 3-5 focused points per slide
- Descriptive titles (never "Slide 1")
- No audio notes (generated separately)"""

    def _generate_single(
        self,
        description: str,
        target: int,
        constraints: str,
        narration_instructions: Optional[str],
        comment_max_ratio: Optional[float]
    ) -> Optional[PresentationOutline]:
        """Generate outline in single request."""
        prompt = self._create_prompt(description, constraints, f"{target} slides")
        content = self.client.call(prompt, max_tokens=4000, context="Generate outline")

        if not content:
            return None

        data = extract_json(content)
        if not data:
            return None

        outline = PresentationOutline(**data)
        outline.narration_instructions = narration_instructions
        outline.comment_max_ratio = comment_max_ratio
        return outline

    def _generate_batched(
        self,
        description: str,
        target: int,
        constraints: str,
        narration_instructions: Optional[str]
    ) -> Optional[PresentationOutline]:
        """Generate outline in batches for large presentations."""
        # First: get high-level structure
        structure = self._generate_structure(description, target)
        if not structure:
            return None

        title = structure.get("title", "Presentation")
        sections = structure.get("sections", [])

        # Generate slides for each section
        all_slides = []
        for section in sections:
            slides = self._generate_section_slides(description, section, constraints)
            all_slides.extend(slides)

        if not all_slides:
            return None

        return PresentationOutline(
            title=title,
            slides=all_slides,
            narration_instructions=narration_instructions
        )

    def _generate_structure(self, description: str, target: int) -> Optional[dict]:
        """Generate high-level section structure."""
        prompt = f"""Create structure for a {target}-slide presentation.

Topic: {description}

Return JSON:
{{
    "title": "Presentation Title",
    "sections": [
        {{"name": "Section Name", "slide_count": 3, "topics": ["topic1", "topic2"]}}
    ]
}}

Divide into 3-5 logical sections."""

        content = self.client.call(prompt, max_tokens=1500, context="Generate structure")
        return extract_json(content) if content else None

    def _generate_section_slides(
        self,
        description: str,
        section: dict,
        constraints: str
    ) -> list[SlideOutline]:
        """Generate slides for a section."""
        section_name = section.get("name", "Section")
        slide_count = section.get("slide_count", 3)
        topics = ", ".join(section.get("topics", []))

        context = f"Section: {section_name}\nTopics: {topics}"
        prompt = self._create_prompt(description, constraints, f"{slide_count} slides", context)

        content = self.client.call(prompt, max_tokens=2000, context=f"Section: {section_name}")
        data = extract_json(content) if content else None

        if data and "slides" in data:
            return [SlideOutline(**s) for s in data["slides"]]
        return []
