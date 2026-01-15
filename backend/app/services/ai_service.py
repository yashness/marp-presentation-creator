"""AI service for presentation generation using Anthropic Claude."""

import json
import os
import re
import httpx
from typing import Optional
from anthropic import Anthropic
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
    narration_instructions: str | None = None
    comment_max_ratio: float | None = None


class AIService:
    """Service for AI-powered presentation generation."""

    def __init__(self):
        """Initialize AI service with Azure credentials."""
        self.azure_endpoint = os.getenv("AZURE_ENDPOINT")
        self.api_key = os.getenv("API_KEY") or os.getenv("AZURE_API_KEY")
        self.deployment = os.getenv("AZURE_DEPLOYMENT", "claude-haiku-4-5")
        self.image_deployment = os.getenv("AZURE_IMAGE_DEPLOYMENT", "dall-e-3")
        self.api_version = os.getenv("AZURE_API_VERSION", "2024-05-01-preview")
        self.anthropic_version = os.getenv("ANTHROPIC_VERSION", "2023-06-01")
        self.slide_batch_size = 4

        if not self.azure_endpoint or not self.api_key:
            logger.warning("Azure credentials not configured")
            self.client = None
        else:
            # Azure Anthropic requires the Azure resource endpoint + /anthropic,
            # the deployment name as the model, and api-version query parameter.
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

    def _extract_outline_json(self, raw_content: str) -> Optional[dict]:
        """Attempt to parse outline JSON from model response."""
        if not raw_content:
            logger.error("Outline response was empty")
            return None

        cleaned = raw_content.strip()

        # Try raw_decode which can extract JSON from string with trailing text
        decoder = json.JSONDecoder()
        try:
            parsed, idx = decoder.raw_decode(cleaned)
            logger.debug(f"Successfully parsed JSON using raw_decode (consumed {idx} of {len(cleaned)} chars)")
            return parsed
        except json.JSONDecodeError as e:
            logger.debug(f"raw_decode failed: {e}")

        # Try to find JSON within code fences
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
        if fenced:
            try:
                parsed = json.loads(fenced.group(1))
                logger.debug("Successfully parsed JSON from code fence")
                return parsed
            except json.JSONDecodeError:
                pass

        # Last resort: try the whole cleaned string
        try:
            parsed = json.loads(cleaned)
            logger.debug("Successfully parsed entire response as JSON")
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"All JSON parsing attempts failed")
            logger.error(f"Response length: {len(cleaned)} chars")
            logger.error(f"First 500 chars: {cleaned[:500]}")
            logger.error(f"Last 200 chars: {cleaned[-200:]}")
            return None

    @staticmethod
    def _strip_outer_code_fence(text: str) -> str:
        if not text:
            return text
        fenced = re.match(r"^```(?:markdown|md)?\s*([\s\S]*?)\s*```$", text.strip(), re.IGNORECASE)
        if fenced:
            return fenced.group(1).strip()
        return text.strip()

    @staticmethod
    def _strip_frontmatter(text: str) -> str:
        if not text:
            return text
        return re.sub(r"^---\s*[\s\S]*?---\s*", "", text.strip())

    def _sanitize_slide_markdown(self, text: str) -> str:
        cleaned = text or ""
        cleaned = self._strip_outer_code_fence(cleaned)
        cleaned = self._strip_frontmatter(cleaned)
        return cleaned.strip()

    def _sanitize_slide_comment(self, text: str) -> str:
        cleaned = text or ""
        fenced = re.search(r"```(?:markdown|md)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
        if fenced:
            cleaned = fenced.group(1)
        cleaned = self._strip_outer_code_fence(cleaned)
        return cleaned.strip()


    @staticmethod
    def _limit_comment_length(comment: str, slide_content: str, max_ratio: float) -> str:
        slide_len = AIService._measure_slide_text_length(slide_content)
        if slide_len <= 0:
            return ""
        ratio = max(0.1, min(1.0, max_ratio))
        max_len = min(slide_len, max(1, int(slide_len * ratio)))
        if max_len <= 0:
            return ""
        if len(comment) <= max_len:
            return comment.strip()
        return AIService._truncate_comment(comment, max_len)

    @staticmethod
    def _extract_heading(text: str) -> str:
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith("#"):
                return stripped.lstrip("#").strip()
        return ""

    @staticmethod
    def _extract_bullets(text: str) -> list[str]:
        bullets = []
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith("- ") or stripped.startswith("* "):
                bullets.append(stripped[2:].strip())
        return bullets

    @staticmethod
    def _strip_markdown_for_length(text: str) -> str:
        cleaned = re.sub(r"```[\s\S]*?```", "", text)
        cleaned = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", cleaned)
        cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cleaned)
        cleaned = re.sub(r"^\s*[-*+]\s+", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"[#>*`_~]", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    @staticmethod
    def _measure_slide_text_length(text: str) -> int:
        cleaned = AIService._strip_markdown_for_length(text)
        return len(cleaned)

    @staticmethod
    def _truncate_comment(comment: str, max_len: int) -> str:
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
    def _build_slide_narration(
        heading: str,
        focus: str,
        index: int,
        total: int,
        prev_heading: str = "",
        next_heading: str = ""
    ) -> str:
        """Generate fallback narration for a slide."""
        parts = []

        if index == 0:
            parts.append(f"Let's explore {heading.lower()}.")
        elif index == total - 1:
            parts.append(f"To wrap up, let's look at {heading.lower()}.")
        else:
            parts.append(f"Now let's discuss {heading.lower()}.")

        if focus:
            parts.append(focus)

        return " ".join(parts)

    @staticmethod
    def _enforce_comment_length(
        comment: str,
        slide_text: str,
        fallback_comment: str,
        max_ratio: Optional[float]
    ) -> str:
        """Limit comment length if max_ratio is specified."""
        if not comment:
            return fallback_comment
        if not max_ratio:
            return comment.strip()

        slide_len = AIService._measure_slide_text_length(slide_text)
        if slide_len <= 0:
            return comment.strip()

        max_len = max(1, int(slide_len * max_ratio))
        comment_len = len(AIService._strip_markdown_for_length(comment))

        if comment_len <= max_len:
            return comment.strip()

        # If comment is too long, use fallback
        fallback_len = len(AIService._strip_markdown_for_length(fallback_comment))
        if fallback_len <= max_len:
            return fallback_comment

        # If even fallback is too long, truncate it
        return AIService._truncate_comment(fallback_comment, max_len)

    def generate_outline(
        self,
        description: str,
        slide_count: Optional[int] = None,
        subtopic_count: Optional[int] = None,
        audience: Optional[str] = None,
        flavor: Optional[str] = None,
        narration_instructions: Optional[str] = None,
        comment_max_ratio: Optional[float] = None
    ) -> Optional[PresentationOutline]:
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
            constraint_lines = []
            if slide_count:
                constraint_lines.append(f"- Desired slide count: {slide_count}")
            if subtopic_count:
                constraint_lines.append(f"- Desired subtopic count: {subtopic_count}")
            if audience:
                constraint_lines.append(f"- Target audience: {audience}")
            if flavor:
                constraint_lines.append(f"- Extra flavor/angle: {flavor}")
            if narration_instructions:
                constraint_lines.append(f"- Narration instructions: {narration_instructions}")
            if comment_max_ratio:
                constraint_lines.append(f"- Narration length target: <= {int(comment_max_ratio * 100)}% of slide text")
            constraint_block = "\n".join(constraint_lines) if constraint_lines else "None provided."

            slide_count_hint = f"{slide_count} slides" if slide_count else "5-8 slides"

            prompt = f"""You are an expert educator creating a presentation outline. Your goal is to create narration that TEACHES the content, not just announces it.

Topic: {description}

Optional constraints (honor if possible):
{constraint_block}

Generate a structured outline with:
1. A compelling presentation title
2. {slide_count_hint} with:
   - Clear, concise titles
   - 3-5 key points per slide
   - Teaching-focused audio narration

Respond in JSON format:
{{
    "title": "Presentation Title",
    "slides": [
        {{
            "title": "Slide Title",
            "content_points": ["Point 1", "Point 2", "Point 3"],
            "notes": "Narration that teaches this slide's concepts"
        }}
    ]
}}

CRITICAL NARRATION REQUIREMENTS:
- TEACH the concepts, don't just read or announce what's on the slide
- Explain WHY things matter, HOW they work, WHAT the implications are
- Use natural, conversational language as if explaining to a student
- Build a cohesive narrative that flows across slides like a lecture or podcast
- Each narration should stand alone but also connect to the overall story
- 2-4 sentences per slide, but make every sentence meaningful
- First slide: Set context and preview what we'll learn
- Middle slides: Explain concepts deeply, build understanding
- Last slide: Synthesize key insights and reinforce takeaways

BAD (announces): "We just covered X. Here we focus on Y and Z. Next we'll look at A."
GOOD (teaches): "Understanding Y is crucial because it determines how Z behaves in real systems. This principle explains why A happens."

Do not include markdown formatting, frontmatter, or code fences in your response."""

            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text if response.content else ""
            data = self._extract_outline_json(content)
            if not data:
                return None
            outline = PresentationOutline(**data)
            if narration_instructions:
                outline.narration_instructions = narration_instructions
            if comment_max_ratio:
                outline.comment_max_ratio = comment_max_ratio
            return outline

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
Theme: {theme}

Create engaging markdown with:
- Clear heading
- Bullet points or structured content
- Appropriate formatting (bold, italic, code blocks if needed)
- Keep it concise and visual

Return only the slide markdown content (no frontmatter, no code fences, no commentary).
Do not include slide separators (`---`)."""

            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            return self._sanitize_slide_markdown(response.content[0].text)

        except Exception as e:
            logger.error(f"Failed to generate slide content: {e}")
            return f"# {slide_outline.title}\n\n" + "\n".join(f"- {point}" for point in slide_outline.content_points)

    def generate_slide_batch(
        self,
        slides: list[SlideOutline],
        theme: str,
        batch_index: int,
        batch_total: int,
        narration_instructions: Optional[str]
    ) -> str:
        """Generate markdown for a batch of slides with per-slide comments."""
        if not self.client:
            chunks = []
            for slide in slides:
                content = f"# {slide.title}\n\n" + "\n".join(f"- {point}" for point in slide.content_points)
                comment = self._sanitize_slide_comment(slide.notes or "")
                if comment:
                    content += f"\n\n<!--\n{comment}\n-->"
                chunks.append(content)
            return "\n\n---\n\n".join(chunks)

        slide_lines = []
        for idx, slide in enumerate(slides, start=1):
            notes = slide.notes or ""
            slide_lines.append(
                f"Outline item {idx} title: {slide.title}\n"
                f"Outline item {idx} points: {', '.join(slide.content_points)}\n"
                f"Outline item {idx} notes: {notes}"
            )
        slide_block = "\n\n".join(slide_lines)
        narration_hint = narration_instructions or "Teach the content clearly and succinctly."

        prompt = f"""You are creating Marp markdown slides with teaching-focused narration. This is batch {batch_index} of {batch_total}.

Theme: {theme}

Content to cover:
{slide_block}

NARRATION PHILOSOPHY:
Your narration should feel like a teacher or expert explaining concepts to an engaged learner. You are NOT reading bullet points or transitioning between slides. You are TEACHING the material in a way that builds understanding.

{narration_hint}

FORMAT REQUIREMENTS:
- Output slides separated by `---`
- Each slide MUST have a narration comment: <!-- your teaching narration -->
- Slide content: clean markdown with 3-5 bullets, ~8 lines max
- Use varied layouts across the deck (title-only, quote, list, image, comparison, short paragraph)
- Include a mermaid diagram when it fits the topic
- No frontmatter, no code fences, no meta-commentary

NARRATION REQUIREMENTS (CRITICAL):
- TEACH the concepts: explain WHY, HOW, and WHAT IT MEANS
- Use natural, conversational language (like a podcast or lecture)
- Connect ideas across slides to build a cohesive narrative
- 1-2 sentences, ~20-40 words, and no longer than the slide text
- Each narration should deepen understanding, not summarize bullets
- Build on previous concepts, foreshadow next ideas naturally
- Assume the listener can't see the slide - your narration should teach standalone
- If an outline item is dense, split it into 2 slides with continuation titles and narrate each separately
- First slide of the deck should feel like a warm intro; last slide should feel like a clear outro and summary

EXAMPLES OF GOOD NARRATION:
❌ BAD: "Here we focus on Refraction and how light bends. Next we'll look at examples."
✅ GOOD: "When light moves from air into water, it slows down and bends at the boundary. This bending - refraction - follows a precise mathematical relationship that lets us predict exactly how much the light path will change based on the materials involved."

❌ BAD: "We just covered reflection. Now we'll discuss types of reflection."
✅ GOOD: "Not all reflections look the same. A smooth mirror gives you a sharp image because every light ray bounces at the same predictable angle. But rough surfaces scatter light in all directions, which is why you can't see your reflection in a brick wall even though it's also reflecting light."

Create engaging, educational narration that makes the content come alive."""

        response = self.client.messages.create(
            model=self.deployment,
            max_tokens=1400,
            messages=[{"role": "user", "content": prompt}]
        )
        return self._sanitize_slide_markdown(response.content[0].text)

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

        blocks = []
        total_batches = max(1, (len(outline.slides) + self.slide_batch_size - 1) // self.slide_batch_size)
        for batch_index in range(total_batches):
            start = batch_index * self.slide_batch_size
            end = start + self.slide_batch_size
            batch_slides = outline.slides[start:end]
            batch_md = self.generate_slide_batch(
                batch_slides,
                theme,
                batch_index + 1,
                total_batches,
                outline.narration_instructions
            )
            batch_md = self._sanitize_slide_markdown(batch_md)
            batch_blocks = re.split(r"\n---\s*\n", batch_md) if batch_md else []
            for block in [b for b in batch_blocks if b.strip()]:
                blocks.append(block.strip())

        slides_content = []
        for idx, block in enumerate(blocks):
            # Extract narration comment from the AI-generated block
            comment_match = re.search(r"<!--\s*([\s\S]*?)\s*-->", block)
            comment = comment_match.group(1).strip() if comment_match else ""

            # Extract slide content (everything except the comment)
            block_body = re.sub(r"<!--\s*[\s\S]*?\s*-->", "", block).strip()

            heading = self._extract_heading(block_body)
            bullets = self._extract_bullets(block_body)
            focus = bullets[0] if bullets else ""
            prev_heading = self._extract_heading(blocks[idx - 1]) if idx > 0 else ""
            next_heading = self._extract_heading(blocks[idx + 1]) if idx + 1 < len(blocks) else ""

            if not comment:
                logger.warning(f"Slide {idx + 1} missing narration - adding fallback")
                comment = self._build_slide_narration(
                    heading=heading,
                    focus=focus,
                    index=idx,
                    total=len(blocks),
                    prev_heading=prev_heading,
                    next_heading=next_heading
                )

            fallback_comment = self._build_slide_narration(
                heading=heading,
                focus=focus,
                index=idx,
                total=len(blocks),
                prev_heading=prev_heading,
                next_heading=next_heading
            )
            comment = self._enforce_comment_length(
                comment,
                block_body,
                fallback_comment,
                outline.comment_max_ratio
            )

            block_with_comment = f"{block_body}\n\n<!--\n{comment}\n-->"
            slides_content.append(block_with_comment)

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
            azure_base = self.azure_endpoint.rstrip("/").removesuffix("/anthropic")
            image_url = f"{azure_base}/openai/deployments/{self.image_deployment}/images/generations"
            params = {"api-version": os.getenv("AZURE_IMAGE_API_VERSION", "2024-02-01")}

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
