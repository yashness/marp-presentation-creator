"""Audio-aware commentary generation for slides."""

from loguru import logger

from .client import AIClient
from .text_utils import extract_json_array, format_for_audio


class CommentaryGenerator:
    """Generate TTS-ready commentary for slides."""

    def __init__(self, client: AIClient):
        self.client = client
        self.batch_size = 4

    def generate_all(self, slides: list[dict], style: str = "professional") -> list[str]:
        """Generate commentary for all slides in batches."""
        if not self.client.is_available:
            return ["" for _ in slides]

        all_comments = []
        total = len(slides)

        for start in range(0, total, self.batch_size):
            end = min(start + self.batch_size, total)
            batch = slides[start:end]
            comments = self._generate_batch(batch, style, start, total)
            all_comments.extend(comments)

        return all_comments

    def generate_single(
        self,
        slide_content: str,
        previous_comment: str | None = None,
        context_before: str | None = None,
        context_after: str | None = None,
        style: str = "professional"
    ) -> str:
        """Generate commentary for a single slide."""
        if not self.client.is_available:
            return previous_comment or ""

        context = self._build_context(context_before, context_after)
        prompt = self._create_single_prompt(slide_content, context, style)

        content = self.client.call(prompt, max_tokens=200, context="Single comment")
        return format_for_audio(content) if content else (previous_comment or "")

    def _generate_batch(
        self,
        slides: list[dict],
        style: str,
        start_idx: int,
        total: int
    ) -> list[str]:
        """Generate commentary for a batch of slides."""
        prompt = self._create_batch_prompt(slides, style, start_idx)
        content = self.client.call(prompt, max_tokens=2000, context=f"Commentary batch {start_idx + 1}")

        if not content:
            return ["" for _ in slides]

        comments = extract_json_array(content)
        if comments:
            return [format_for_audio(c) for c in comments]

        return ["" for _ in slides]

    def _build_context(self, before: str | None, after: str | None) -> str:
        """Build context from surrounding slides."""
        parts = []
        if before:
            parts.append(f"Previous slide: {before[-200:]}")
        if after:
            parts.append(f"Next slide: {after[:200]}")
        return "\n".join(parts)

    def _create_batch_prompt(self, slides: list[dict], style: str, start_idx: int) -> str:
        """Create batch commentary prompt."""
        slide_block = "\n\n".join(
            f"[Slide {start_idx + i + 1}]\n{s.get('content', '')}"
            for i, s in enumerate(slides)
        )

        return f"""Generate audio narration for these slides.

{slide_block}

TTS RULES (spoken aloud):
1. NO markdown: no **, #, `, -
2. Expand abbreviations: "API" → "A P I"
3. Space acronyms: "CNN" → "C N N"
4. 2-3 sentences (40-60 words) per slide
5. Never say: "Let's", "Here's", "This slide"
6. Reference SPECIFIC slide content
7. Flow naturally between slides

Style: {style}

Return JSON array:
["Commentary for slide 1", "Commentary for slide 2", ...]"""

    def _create_single_prompt(self, content: str, context: str, style: str) -> str:
        """Create single slide commentary prompt."""
        return f"""Generate audio narration for this slide.

SLIDE:
{content}
{context}

TTS RULES:
1. NO markdown formatting
2. Expand abbreviations for speech
3. 2-3 sentences (40-60 words)
4. Never say "Let's", "Here's", "This slide"
5. Reference SPECIFIC content

Style: {style}

Return narration text only."""
