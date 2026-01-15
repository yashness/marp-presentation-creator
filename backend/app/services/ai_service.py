"""AI service for presentation generation using Anthropic Claude."""

import os
import base64
import httpx
from typing import Optional
from anthropic import AnthropicBedrock
from pydantic import BaseModel
from loguru import logger


class SlideOutline(BaseModel):
    """Outline for a single slide."""
    title: str
    content_points: list[str]
    notes: str = ""


class PresentationOutline(BaseModel):
    """Outline for entire presentation."""
    title: str
    slides: list[SlideOutline]


class AIService:
    """Service for AI-powered presentation generation."""

    def __init__(self):
        """Initialize AI service with Azure credentials."""
        self.azure_endpoint = os.getenv("AZURE_ENDPOINT")
        self.api_key = os.getenv("API_KEY")
        self.deployment = os.getenv("AZURE_DEPLOYMENT", "claude-haiku-4-5")
        self.image_deployment = os.getenv("AZURE_IMAGE_DEPLOYMENT", "dall-e-3")

        if not self.azure_endpoint or not self.api_key:
            logger.warning("Azure credentials not configured")
            self.client = None
        else:
            self.client = AnthropicBedrock(
                base_url=self.azure_endpoint,
                api_key=self.api_key,
            )

    def generate_outline(self, description: str) -> Optional[PresentationOutline]:
        """Generate presentation outline from description.

        Args:
            description: User's description of what they want

        Returns:
            Presentation outline with slides
        """
        if not self.client:
            logger.error("AI client not initialized")
            return None

        try:
            prompt = f"""You are a presentation expert. Create a detailed outline for a presentation based on this description:

{description}

Generate a structured outline with:
1. A compelling presentation title
2. 5-8 slides with:
   - Clear, concise titles
   - 3-5 key points per slide
   - Brief speaker notes

Respond in JSON format:
{{
    "title": "Presentation Title",
    "slides": [
        {{
            "title": "Slide Title",
            "content_points": ["Point 1", "Point 2", "Point 3"],
            "notes": "Speaker notes for this slide"
        }}
    ]
}}"""

            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text

            import json
            data = json.loads(content)
            return PresentationOutline(**data)

        except Exception as e:
            logger.error(f"Failed to generate outline: {e}")
            return None

    def generate_slide_content(
        self,
        slide_outline: SlideOutline,
        theme: str = "professional"
    ) -> str:
        """Generate markdown content for a single slide.

        Args:
            slide_outline: Outline for the slide
            theme: Presentation theme/style

        Returns:
            Markdown content for the slide
        """
        if not self.client:
            logger.error("AI client not initialized")
            return f"# {slide_outline.title}\n\n" + "\n".join(f"- {point}" for point in slide_outline.content_points)

        try:
            prompt = f"""Convert this slide outline into polished Marp markdown:

Title: {slide_outline.title}
Points: {', '.join(slide_outline.content_points)}
Notes: {slide_outline.notes}
Theme: {theme}

Create engaging markdown with:
- Clear heading
- Bullet points or structured content
- Appropriate formatting (bold, italic, code blocks if needed)
- Keep it concise and visual

Return only the markdown content, no extra text."""

            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()

        except Exception as e:
            logger.error(f"Failed to generate slide content: {e}")
            return f"# {slide_outline.title}\n\n" + "\n".join(f"- {point}" for point in slide_outline.content_points)

    def generate_full_presentation(
        self,
        outline: PresentationOutline,
        theme: str = "professional"
    ) -> str:
        """Generate complete presentation markdown.

        Args:
            outline: Complete presentation outline
            theme: Presentation theme/style

        Returns:
            Full Marp markdown presentation
        """
        frontmatter = f"""---
marp: true
title: {outline.title}
theme: default
paginate: true
---

"""

        slides_content = []
        for idx, slide in enumerate(outline.slides):
            slide_md = self.generate_slide_content(slide, theme)

            if slide.notes:
                slide_md += f"\n\n<!-- {slide.notes} -->"

            slides_content.append(slide_md)

        return frontmatter + "\n\n---\n\n".join(slides_content)

    def rewrite_slide(self, current_content: str, instruction: str) -> str:
        """Rewrite a slide based on user instruction.

        Args:
            current_content: Current slide markdown
            instruction: How to modify the slide

        Returns:
            Rewritten slide markdown
        """
        if not self.client:
            logger.error("AI client not initialized")
            return current_content

        try:
            prompt = f"""Rewrite this slide based on the instruction:

Current content:
{current_content}

Instruction: {instruction}

Return only the updated markdown content, no extra text."""

            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()

        except Exception as e:
            logger.error(f"Failed to rewrite slide: {e}")
            return current_content

    def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard"
    ) -> Optional[str]:
        """Generate image using DALL-E via Azure OpenAI.

        Args:
            prompt: Description of the image to generate
            size: Image dimensions (1024x1024, 1792x1024, 1024x1792)
            quality: Image quality (standard or hd)

        Returns:
            Base64 encoded image data or None if failed
        """
        if not self.azure_endpoint or not self.api_key:
            logger.error("Azure credentials not configured")
            return None

        try:
            azure_base = self.azure_endpoint.replace("/anthropic", "")
            image_url = f"{azure_base}/openai/deployments/{self.image_deployment}/images/generations"
            params = {"api-version": "2024-02-01"}

            headers = {
                "api-key": self.api_key,
                "Content-Type": "application/json"
            }

            payload = {
                "prompt": prompt,
                "size": size,
                "n": 1,
                "quality": quality,
                "response_format": "b64_json"
            }

            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    image_url,
                    headers=headers,
                    params=params,
                    json=payload
                )
                response.raise_for_status()

            data = response.json()
            if data.get("data") and len(data["data"]) > 0:
                return data["data"][0].get("b64_json")

            logger.error("No image data in response")
            return None

        except Exception as e:
            logger.error(f"Failed to generate image: {e}")
            return None

    def generate_theme_css(
        self,
        theme_name: str,
        brand_colors: list[str],
        description: str = ""
    ) -> Optional[str]:
        """Generate Marp theme CSS based on brand colors and description.

        Args:
            theme_name: Name for the theme
            brand_colors: List of hex color codes (primary, secondary, etc.)
            description: Additional context about brand style

        Returns:
            Generated CSS theme content
        """
        if not self.client:
            logger.error("AI client not initialized")
            return None

        try:
            color_info = "\n".join([f"Color {i+1}: {c}" for i, c in enumerate(brand_colors)])

            prompt = f"""Generate a professional Marp theme CSS file based on these brand colors:

{color_info}

Theme name: {theme_name}
{f'Style description: {description}' if description else ''}

Create a complete Marp theme with:
1. Section styling with color hierarchy
2. Typography (headings, body text, code)
3. Layout and spacing
4. Lists, blockquotes, tables
5. Color scheme that uses the provided colors tastefully

The CSS should follow Marp theme structure:
- Use :root for variables
- Style section elements
- Include h1-h6, p, ul, ol, code, pre, blockquote, table, etc.

Return ONLY the CSS code, no markdown formatting or explanations."""

            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            css_content = response.content[0].text.strip()

            # Clean up markdown code blocks if present
            if css_content.startswith("```"):
                lines = css_content.split("\n")
                css_content = "\n".join(lines[1:-1]) if len(lines) > 2 else css_content

            return css_content

        except Exception as e:
            logger.error(f"Failed to generate theme: {e}")
            return None
