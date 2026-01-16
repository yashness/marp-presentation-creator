"""Slide rewriting and transformation operations."""

from .client import AIClient
from .text_utils import sanitize_markdown, parse_slide_blocks


class SlideOperations:
    """Slide rewriting with viewport awareness."""

    MAX_BULLETS = 6
    MAX_CHARS = 80
    MAX_LINES = 12

    def __init__(self, client: AIClient):
        self.client = client

    def rewrite(self, content: str, instruction: str) -> str:
        """Rewrite slide with custom instruction."""
        if not self.client.is_available:
            return content

        prompt = self._create_rewrite_prompt(content, instruction)
        result = self.client.call(prompt, max_tokens=600, context="Rewrite slide")
        return sanitize_markdown(result) if result else content

    def rewrite_layout(self, content: str) -> str:
        """Change slide layout while keeping content."""
        instruction = "Change layout: try columns, grid, or different organization. Keep same information."
        return self.rewrite(content, instruction)

    def restyle(self, content: str, style: str = "modern") -> str:
        """Restyle slide content with different tone."""
        instruction = f"Restyle to be more {style}. Keep core info but adjust tone."
        return self.rewrite(content, instruction)

    def simplify(self, content: str) -> str:
        """Simplify slide for clarity."""
        instruction = "Simplify: shorter phrases, remove details, make scannable."
        return self.rewrite(content, instruction)

    def expand(self, content: str) -> str:
        """Expand slide with more detail."""
        instruction = "Add more detail and examples while staying within viewport."
        return self.rewrite(content, instruction)

    def split(self, content: str) -> list[str]:
        """Split overloaded slide into multiple slides."""
        if not self.client.is_available:
            return [content]

        prompt = f"""This slide has too much content. Split into multiple slides.

Current:
{content}

Rules:
- Create 2-3 focused slides
- Max {self.MAX_BULLETS} bullets each
- Separate with ---
- Maintain logical flow

Return markdown only."""

        result = self.client.call(prompt, max_tokens=1200, context="Split slide")
        if not result:
            return [content]

        blocks = parse_slide_blocks(sanitize_markdown(result))
        return blocks if blocks else [content]

    def _create_rewrite_prompt(self, content: str, instruction: str) -> str:
        """Create rewrite prompt with viewport constraints."""
        return f"""Rewrite this slide.

Current:
{content}

Instruction: {instruction}

VIEWPORT CONSTRAINTS:
- Max {self.MAX_BULLETS} bullets
- Max {self.MAX_CHARS} chars per bullet
- Max {self.MAX_LINES} lines total

Return markdown only, no code fences."""
