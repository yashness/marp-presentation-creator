"""Service for extracting colors from images using Claude Vision."""

import json
import os
import re
from typing import Optional
import httpx
from anthropic import Anthropic
from loguru import logger


class ColorExtractionService:
    """Service for extracting color palettes from images using Claude Vision."""

    def __init__(self):
        """Initialize color extraction service with Azure credentials."""
        self.azure_endpoint = os.getenv("AZURE_ENDPOINT")
        self.api_key = os.getenv("API_KEY") or os.getenv("AZURE_API_KEY")
        self.deployment = os.getenv("AZURE_DEPLOYMENT", "claude-haiku-4-5")
        self.api_version = os.getenv("AZURE_API_VERSION", "2024-05-01-preview")
        self.anthropic_version = os.getenv("ANTHROPIC_VERSION", "2023-06-01")

        if not self.azure_endpoint or not self.api_key:
            logger.warning("Azure credentials not configured for color extraction")
            self.client = None
        else:
            base_url = self.azure_endpoint.rstrip("/")
            default_headers = {
                "api-key": self.api_key,
                "anthropic-version": self.anthropic_version,
            }
            http_client = httpx.Client(
                timeout=30.0,
                base_url=base_url,
                params={"api-version": self.api_version},
            )
            self.client = Anthropic(
                base_url=base_url,
                api_key=self.api_key,
                default_headers=default_headers,
                http_client=http_client,
            )

    def extract_colors(
        self,
        base64_image: str,
        media_type: str = "image/png"
    ) -> Optional[dict]:
        """Extract color palette from an image.

        Args:
            base64_image: Base64 encoded image data
            media_type: MIME type of the image

        Returns:
            Dictionary with colors, color_names, and description
        """
        if not self.client:
            logger.error("AI client not initialized for color extraction")
            return None

        try:
            prompt = """Analyze this image/screenshot and extract the dominant color palette.

Identify the following colors:
1. Primary color (main brand color, most prominent)
2. Secondary color (accent color, supporting color)
3. Background color (main background)
4. Text color (primary text color)
5. Highlight/accent color (for buttons, links, CTAs)
6. Any additional distinctive colors (up to 2 more)

For each color, provide:
- The exact hex color code
- A descriptive name

Also describe the overall visual style/aesthetic of the design.

Respond in JSON format:
{
    "colors": ["#hex1", "#hex2", "#hex3", ...],
    "color_names": {
        "#hex1": "Primary Blue",
        "#hex2": "Soft Gray Background",
        ...
    },
    "description": "Modern minimalist design with a tech-forward aesthetic..."
}

Return ONLY valid JSON, no additional text."""

            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=1000,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_image
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }]
            )

            if not response.content:
                logger.error("Empty response from AI for color extraction")
                return None

            content = response.content[0].text.strip()
            return self._parse_color_response(content)

        except Exception as e:
            logger.error(f"Failed to extract colors: {e}")
            return None

    def _parse_color_response(self, content: str) -> Optional[dict]:
        """Parse the AI response to extract color data."""
        try:
            # Try to parse as JSON directly
            data = json.loads(content)
            return self._validate_color_data(data)
        except json.JSONDecodeError:
            pass

        # Try to extract JSON from code fences
        json_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", content)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._validate_color_data(data)
            except json.JSONDecodeError:
                pass

        # Try raw_decode
        try:
            decoder = json.JSONDecoder()
            data, _ = decoder.raw_decode(content)
            return self._validate_color_data(data)
        except json.JSONDecodeError:
            pass

        logger.error(f"Failed to parse color extraction response: {content[:200]}")
        return None

    def _validate_color_data(self, data: dict) -> dict:
        """Validate and normalize color data."""
        colors = data.get("colors", [])
        color_names = data.get("color_names", {})
        description = data.get("description", "")

        # Validate hex colors
        valid_colors = []
        valid_color_names = {}
        hex_pattern = re.compile(r"^#[0-9a-fA-F]{6}$")

        for color in colors:
            if isinstance(color, str):
                # Normalize to uppercase
                color = color.upper()
                if hex_pattern.match(color):
                    valid_colors.append(color)

        for hex_code, name in color_names.items():
            normalized = hex_code.upper()
            if hex_pattern.match(normalized):
                valid_color_names[normalized] = name

        return {
            "colors": valid_colors[:8],  # Max 8 colors
            "color_names": valid_color_names,
            "description": description[:500]  # Limit description length
        }
