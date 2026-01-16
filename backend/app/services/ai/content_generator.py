"""Slide content generation with batching and viewport awareness."""

from .client import AIClient
from .models import SlideOutline, PresentationOutline
from .text_utils import sanitize_markdown, fix_broken_comments, parse_slide_blocks


class ContentGenerator:
    """Generate slide content without comments (comments generated separately)."""

    # Slide viewport constraints (Marp 16:9)
    MAX_BULLETS = 6
    MAX_CHAR_PER_BULLET = 80
    MAX_LINES = 12

    def __init__(self, client: AIClient):
        self.client = client
        self.batch_size = 4

    def generate(
        self,
        outline: PresentationOutline,
        theme: str = "professional",
        language: str | None = None
    ) -> str:
        """Generate full presentation content without comments."""
        frontmatter = self._build_frontmatter(outline.title)
        full_context = self._build_context(outline)

        blocks = [self._create_intro(outline.title)]

        # Generate in batches
        slides = outline.slides
        total_batches = max(1, (len(slides) + self.batch_size - 1) // self.batch_size)

        for i in range(total_batches):
            start = i * self.batch_size
            end = start + self.batch_size
            batch = slides[start:end]
            batch_blocks = self._generate_batch(batch, theme, i + 1, total_batches, full_context, language)
            blocks.extend(batch_blocks)

        blocks.append(self._create_outro(outline.title))
        return frontmatter + "\n\n---\n\n".join(blocks)

    def _build_frontmatter(self, title: str) -> str:
        """Build Marp frontmatter."""
        return f"""---
marp: true
title: {title}
theme: default
paginate: true
---

"""

    def _build_context(self, outline: PresentationOutline) -> str:
        """Build outline context for batch awareness."""
        lines = [f"Presentation: {outline.title}", "Slides:"]
        for i, slide in enumerate(outline.slides, 1):
            lines.append(f"  {i}. {slide.title}")
        return "\n".join(lines)

    def _create_intro(self, title: str) -> str:
        """Create title slide."""
        return f"# {title}"

    def _create_outro(self, title: str) -> str:
        """Create closing slide."""
        return f"# Thank You\n\n**{title}**\n\nQuestions? Let's discuss."

    def _generate_batch(
        self,
        slides: list[SlideOutline],
        theme: str,
        batch_idx: int,
        total_batches: int,
        full_context: str,
        language: str | None = None
    ) -> list[str]:
        """Generate content for a batch of slides."""
        prompt = self._create_prompt(slides, theme, batch_idx, total_batches, full_context, language)
        content = self.client.call(prompt, max_tokens=2500, context=f"Content batch {batch_idx}")

        if not content:
            return self._create_fallback(slides)

        content = sanitize_markdown(content)
        content = fix_broken_comments(content)
        return parse_slide_blocks(content)

    def _create_prompt(
        self,
        slides: list[SlideOutline],
        theme: str,
        batch_idx: int,
        total_batches: int,
        full_context: str,
        language: str | None = None
    ) -> str:
        """Create content generation prompt."""
        slide_block = "\n\n".join(
            f"Slide {i+1}: {s.title}\nPoints: {', '.join(s.content_points)}"
            for i, s in enumerate(slides)
        )

        lang_instruction = ""
        if language and language.lower() != "english":
            lang_instruction = f"\n- LANGUAGE: Write ALL content in {language}"

        return f"""Create Marp slides. Batch {batch_idx}/{total_batches}.

Theme: {theme}

CONTEXT (full presentation):
{full_context}

GENERATE THESE SLIDES:
{slide_block}

RULES:
- Separate with ---
- Descriptive titles (never "Slide 1")
- 3-5 bullets, concise
- Vary layouts: bullets, lists, quotes
- NO HTML comments (narration added separately){lang_instruction}

VIEWPORT (must fit on screen):
- Max {self.MAX_BULLETS} bullets
- Max {self.MAX_CHAR_PER_BULLET} chars per bullet
- Split if too long

Return markdown only, no code fences."""

    def _create_fallback(self, slides: list[SlideOutline]) -> list[str]:
        """Create fallback content when AI fails."""
        blocks = []
        for slide in slides:
            content = f"# {slide.title}\n\n"
            content += "\n".join(f"- {p}" for p in slide.content_points)
            blocks.append(content)
        return blocks
