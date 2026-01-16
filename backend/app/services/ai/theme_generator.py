"""Theme CSS generation."""

from typing import Optional
from loguru import logger

from .client import AIClient


class ThemeGenerator:
    """Generate Marp theme CSS from brand colors."""

    def __init__(self, client: AIClient):
        self.client = client

    def generate(
        self,
        name: str,
        colors: list[str],
        description: str = ""
    ) -> Optional[str]:
        """Generate theme CSS."""
        if not self.client.is_available:
            logger.error("AI client not available")
            return None

        prompt = self._create_prompt(name, colors, description)
        content = self.client.call(prompt, max_tokens=2000, context="Generate theme")

        if not content:
            return None

        return self._clean_css(content)

    def _create_prompt(self, name: str, colors: list[str], description: str) -> str:
        """Create theme generation prompt."""
        color_list = "\n".join(f"Color {i+1}: {c}" for i, c in enumerate(colors))
        style = f"\nStyle: {description}" if description else ""

        return f"""Generate a Marp theme CSS file.

Colors:
{color_list}

Theme: {name}{style}

Include:
1. :root variables for colors
2. Section styling
3. Typography (h1-h6, p, code)
4. Lists, blockquotes, tables

Return CSS only, no markdown."""

    def _clean_css(self, content: str) -> str:
        """Remove code fences if present."""
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            return "\n".join(lines[1:-1]) if len(lines) > 2 else content
        return content
