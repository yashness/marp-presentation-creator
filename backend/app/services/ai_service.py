"""AI service for presentation generation - backward compatible wrapper.

This module re-exports from the new modular ai/ package.
"""

from .ai import AIService, SlideOutline, PresentationOutline, BatchProgress

__all__ = ["AIService", "SlideOutline", "PresentationOutline", "BatchProgress"]
