"""AI client initialization and base operations."""

import os
from typing import Optional, Iterator
import httpx
from anthropic import Anthropic
from loguru import logger


class AIClient:
    """Base AI client with Azure Anthropic integration."""

    def __init__(self):
        """Initialize AI client with Azure credentials."""
        self._load_credentials()
        self._init_client()

    def _load_credentials(self):
        """Load Azure credentials from environment."""
        self.azure_endpoint = os.getenv("AZURE_ENDPOINT")
        self.api_key = os.getenv("API_KEY") or os.getenv("AZURE_API_KEY")
        self.deployment = os.getenv("AZURE_DEPLOYMENT", "claude-haiku-4-5")
        self.image_deployment = os.getenv("AZURE_IMAGE_DEPLOYMENT", "dall-e-3")
        self.api_version = os.getenv("AZURE_API_VERSION", "2024-05-01-preview")
        self.anthropic_version = os.getenv("ANTHROPIC_VERSION", "2023-06-01")

    def _init_client(self):
        """Initialize Anthropic client for Azure."""
        if not self.azure_endpoint or not self.api_key:
            logger.warning("Azure credentials not configured")
            self.client = None
            return

        base_url = self.azure_endpoint.rstrip("/")
        headers = {
            "api-key": self.api_key,
            "anthropic-version": self.anthropic_version,
        }
        http_client = httpx.Client(
            timeout=60.0,
            base_url=base_url,
            params={"api-version": self.api_version},
        )
        self.client = Anthropic(
            base_url=base_url,
            api_key=self.api_key,
            default_headers=headers,
            http_client=http_client,
        )

    @property
    def is_available(self) -> bool:
        """Check if AI client is available."""
        return self.client is not None

    def call(
        self,
        prompt: str,
        max_tokens: int = 4000,
        context: str = "AI request"
    ) -> Optional[str]:
        """Make AI request with error handling."""
        if not self.client:
            logger.error(f"{context}: AI client not initialized")
            return None

        try:
            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )
            if not response.content:
                logger.error(f"{context}: Empty response")
                return None
            return response.content[0].text
        except Exception as e:
            logger.error(f"{context}: {e}")
            return None

    def stream(
        self,
        prompt: str,
        max_tokens: int = 4000,
        context: str = "AI stream"
    ) -> Iterator[str]:
        """Stream AI response for incremental updates."""
        if not self.client:
            logger.error(f"{context}: AI client not initialized")
            return

        try:
            with self.client.messages.stream(
                model=self.deployment,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}]
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except Exception as e:
            logger.error(f"{context}: {e}")
