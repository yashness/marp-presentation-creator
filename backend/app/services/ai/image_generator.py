"""Image generation using DALL-E via Azure."""

import os
from typing import Optional
import httpx
from loguru import logger


class ImageGenerator:
    """Generate images using DALL-E."""

    def __init__(self, azure_endpoint: str, api_key: str, deployment: str):
        self.azure_endpoint = azure_endpoint
        self.api_key = api_key
        self.deployment = deployment

    @property
    def is_available(self) -> bool:
        """Check if image generation is available."""
        return bool(self.azure_endpoint and self.api_key)

    def generate(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard"
    ) -> Optional[str]:
        """Generate image and return base64 data."""
        if not self.is_available:
            logger.error("Azure credentials not configured")
            return None

        try:
            url = self._build_url()
            headers = {"api-key": self.api_key, "Content-Type": "application/json"}
            payload = self._build_payload(prompt, size, quality)

            with httpx.Client(timeout=60.0) as client:
                response = client.post(url, headers=headers, params=self._params(), json=payload)
                response.raise_for_status()

            return self._extract_image(response.json())

        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            return None

    def _build_url(self) -> str:
        """Build DALL-E API URL."""
        base = self.azure_endpoint.rstrip("/").removesuffix("/anthropic")
        return f"{base}/openai/deployments/{self.deployment}/images/generations"

    def _params(self) -> dict:
        """Get API parameters."""
        return {"api-version": os.getenv("AZURE_IMAGE_API_VERSION", "2024-02-01")}

    def _build_payload(self, prompt: str, size: str, quality: str) -> dict:
        """Build request payload."""
        return {
            "prompt": prompt,
            "size": size,
            "n": 1,
            "quality": quality,
            "response_format": "b64_json"
        }

    def _extract_image(self, data: dict) -> Optional[str]:
        """Extract base64 image from response."""
        if data.get("data") and len(data["data"]) > 0:
            return data["data"][0].get("b64_json")
        logger.error("No image data in response")
        return None
