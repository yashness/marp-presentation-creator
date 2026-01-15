"""Comment processing and length enforcement for AI-generated presentation narration."""

import re
from typing import Optional


class CommentProcessor:
    """Handles comment length enforcement and narration generation for slides."""

    @staticmethod
    def strip_markdown_for_length(text: str) -> str:
        """Strip markdown formatting to measure actual text length."""
        cleaned = re.sub(r"```[\s\S]*?```", "", text)
        cleaned = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", cleaned)
        cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cleaned)
        cleaned = re.sub(r"^\s*[-*+]\s+", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"[#>*`_~]", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    @staticmethod
    def measure_slide_text_length(text: str) -> int:
        """Measure the effective text length of a slide after stripping markdown."""
        cleaned = CommentProcessor.strip_markdown_for_length(text)
        return len(cleaned)

    @staticmethod
    def truncate_comment(comment: str, max_len: int) -> str:
        """Truncate a comment to max_len, preserving sentence boundaries when possible."""
        comment = comment.strip()
        if len(comment) <= max_len:
            return comment

        sentences = re.split(r"(?<=[.!?])\s+", comment)
        if len(sentences) > 1:
            collected = []
            current_len = 0
            for sentence in sentences:
                next_len = current_len + len(sentence) + (1 if collected else 0)
                if next_len > max_len:
                    break
                collected.append(sentence)
                current_len = next_len
            if collected:
                return " ".join(collected).strip()

        trimmed = comment[:max_len].rsplit(" ", 1)[0].strip()
        if not trimmed:
            trimmed = comment[:max_len].strip()
        return trimmed

    @staticmethod
    def limit_comment_length(comment: str, slide_content: str, max_ratio: float) -> str:
        """Limit comment length based on a ratio to slide content length."""
        slide_len = CommentProcessor.measure_slide_text_length(slide_content)
        if slide_len <= 0:
            return ""

        ratio = max(0.1, min(1.0, max_ratio))
        max_len = min(slide_len, max(1, int(slide_len * ratio)))
        if max_len <= 0:
            return ""

        if len(comment) <= max_len:
            return comment.strip()

        return CommentProcessor.truncate_comment(comment, max_len)

    @staticmethod
    def enforce_comment_length(
        comment: str,
        slide_text: str,
        fallback_comment: str,
        max_ratio: Optional[float]
    ) -> str:
        """Enforce comment length limits, falling back if needed."""
        if not comment:
            return fallback_comment
        if not max_ratio:
            return comment.strip()

        slide_len = CommentProcessor.measure_slide_text_length(slide_text)
        if slide_len <= 0:
            return comment.strip()

        max_len = max(1, int(slide_len * max_ratio))
        comment_len = len(CommentProcessor.strip_markdown_for_length(comment))

        if comment_len <= max_len:
            return comment.strip()

        # If comment is too long, use fallback
        fallback_len = len(CommentProcessor.strip_markdown_for_length(fallback_comment))
        if fallback_len <= max_len:
            return fallback_comment

        # If even fallback is too long, truncate it
        return CommentProcessor.truncate_comment(fallback_comment, max_len)

    @staticmethod
    def build_slide_narration(
        heading: str,
        focus: str,
        index: int,
        total: int,
        prev_heading: str = "",
        next_heading: str = ""
    ) -> str:
        """Generate fallback narration for a slide based on content."""
        if not focus:
            return heading

        parts = []
        if index == 0:
            parts.append(f"{heading}.")
        elif index == total - 1:
            parts.append(f"Finally, {heading.lower()}.")

        parts.append(focus)
        return " ".join(parts) if parts else focus
