"""AI service for presentation generation using Anthropic Claude."""

import json
import os
import re
import httpx
from typing import Optional
from anthropic import Anthropic
from pydantic import BaseModel
from loguru import logger

from .comment_processor import CommentProcessor


# Pre-compiled regex patterns for performance
JSON_CODE_FENCE_PATTERN = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
MARKDOWN_CODE_FENCE_PATTERN = re.compile(r"^```(?:markdown|md)?\s*([\s\S]*?)\s*```$", re.IGNORECASE)


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

    def _call_ai(
        self,
        prompt: str,
        max_tokens: int = 4000,
        context: str = "AI request"
    ) -> Optional[str]:
        """Centralized AI client call with error handling."""
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
                logger.error(f"{context}: Empty response from AI")
                return None

            return response.content[0].text
        except Exception as e:
            logger.error(f"{context}: AI call failed - {e}")
            return None

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
        fenced = JSON_CODE_FENCE_PATTERN.search(cleaned)
        if fenced:
            try:
                parsed = json.loads(fenced.group(1))
                logger.debug("Successfully parsed JSON from code fence")
                return parsed
            except json.JSONDecodeError as e:
                logger.debug(f"Code fence JSON parsing failed: {e}")
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
        fenced = MARKDOWN_CODE_FENCE_PATTERN.match(text.strip())
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


    def _build_constraint_block(
        self,
        slide_count: Optional[int],
        subtopic_count: Optional[int],
        audience: Optional[str],
        flavor: Optional[str],
        narration_instructions: Optional[str],
        comment_max_ratio: Optional[float]
    ) -> str:
        """Build constraint block for outline generation."""
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
        return "\n".join(constraint_lines) if constraint_lines else "None provided."

    def _create_outline_prompt(self, description: str, constraint_block: str, slide_count_hint: str) -> str:
        """Create the prompt for outline generation."""
        return f"""You are an expert educator creating a presentation outline. Your goal is to create narration that TEACHES the content, not just announces it.

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
- The narration IS the audio content. It must TEACH the concepts, not announce or transition.
- NEVER use meta-phrases like: "Let's", "Here's", "Let me", "We'll", "This presentation", "Today we'll"
- NEVER reference the presentation, slides, or visuals
- Instead, directly explain WHY things matter, HOW they work, WHAT the implications are
- Use natural, conversational teaching language as if explaining to a student in a lecture
- Build a cohesive narrative that flows like an expert podcast or lecture
- Each narration should work standalone as audio - assume listener can't see the slide
- 2-3 sentences per slide that directly teach the core concepts
- First slide: State the key insight or context (no "welcome" or meta-commentary)
- Middle slides: Explain concepts deeply with reasoning
- Last slide: Synthesize insights without saying "we covered" or "in summary"

❌ BAD: "We just covered X. Here we focus on Y and Z. Next we'll look at A."
✅ GOOD: "Understanding Y is crucial because it determines how Z behaves in real systems. This principle explains why A happens."

❌ BAD: "Welcome to this presentation on Machine Learning."
✅ GOOD: "Machine learning enables computers to learn patterns from data without being explicitly programmed for every scenario."

❌ BAD: "Here's something remarkable about plants."
✅ GOOD: "Plants solve a problem that animals can't by capturing energy directly from the sun and transforming it into fuel through photosynthesis."

Do not include markdown formatting, frontmatter, or code fences in your response."""

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
        """Generate presentation outline from description."""
        if not self.client:
            logger.error("AI client not initialized")
            return None

        try:
            constraint_block = self._build_constraint_block(
                slide_count, subtopic_count, audience, flavor,
                narration_instructions, comment_max_ratio
            )
            slide_count_hint = f"{slide_count} slides" if slide_count else "5-8 slides"
            prompt = self._create_outline_prompt(description, constraint_block, slide_count_hint)

            content = self._call_ai(prompt, max_tokens=4000, context="Generate outline")
            if not content:
                return None

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

            content = self._call_ai(prompt, max_tokens=500, context="Generate slide content")
            if not content:
                return f"# {slide_outline.title}\n\n" + "\n".join(f"- {point}" for point in slide_outline.content_points)

            return self._sanitize_slide_markdown(content)

        except Exception as e:
            logger.error(f"Failed to generate slide content: {e}")
            return f"# {slide_outline.title}\n\n" + "\n".join(f"- {point}" for point in slide_outline.content_points)

    def _create_fallback_slides(self, slides: list[SlideOutline]) -> str:
        """Create fallback slides when AI generation fails."""
        chunks = []
        for slide in slides:
            content = f"# {slide.title}\n\n" + "\n".join(f"- {point}" for point in slide.content_points)
            comment = self._sanitize_slide_comment(slide.notes or "")
            if comment:
                content += f"\n\n<!--\n{comment}\n-->"
            chunks.append(content)
        return "\n\n---\n\n".join(chunks)

    def _create_batch_prompt(
        self,
        slides: list[SlideOutline],
        theme: str,
        batch_index: int,
        batch_total: int,
        narration_instructions: Optional[str]
    ) -> str:
        """Create prompt for batch slide generation."""
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

        return f"""You are creating Marp markdown slides with teaching-focused narration. This is batch {batch_index} of {batch_total}.

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

NARRATION REQUIREMENTS (ABSOLUTELY CRITICAL):
- TEACH the actual concepts from the slide content - explain WHY, HOW, and WHAT IT MEANS
- The narration IS the audio content. It must teach, not announce or transition.
- NEVER use meta-phrases like: "Let's", "Here's", "Let me", "Now we'll", "Next we'll", "This slide"
- NEVER reference the presentation, slides, or diagram itself
- Instead, directly explain the concepts as if teaching a student in a lecture
- Use natural, conversational language (like a podcast or expert lecture)
- 1-2 sentences that directly teach the slide's core concepts
- Length should be concise but substantive - roughly similar to slide text length
- Each narration should work standalone as audio - assume listener can't see the slide
- Build on previous concepts naturally, without explicitly referencing "previous slides"
- If an outline item is dense, split it into 2 slides with continuation titles and narrate each separately

EXAMPLES OF GOOD vs BAD NARRATION:
❌ BAD: "Let's explore Refraction and how light bends. Next we'll look at examples."
✅ GOOD: "When light moves from air into water, it slows down and bends at the boundary. This bending follows a precise mathematical relationship."

❌ BAD: "Here's why acceleration matters more than the absolute number."
✅ GOOD: "Acceleration matters more than the absolute number because it reveals whether we're approaching stability or accelerating toward crisis."

❌ BAD: "Let me be direct about what warming does to a planet."
✅ GOOD: "Higher temperatures trigger cascading changes: ice sheets melt, sea levels rise, and weather patterns intensify."

❌ BAD: "This slide covers the water cycle."
✅ GOOD: "Water continuously cycles through evaporation, condensation, and precipitation, driven by solar energy heating Earth's surface."

❌ BAD: "The diagram shows us the two pathways."
✅ GOOD: "In the natural state, enough greenhouse gas keeps temperatures stable, but excess CO2 shifts the balance and traps more heat."

Create narration that directly teaches the content as audio, with zero meta-language or announcement phrases."""

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
            return self._create_fallback_slides(slides)

        prompt = self._create_batch_prompt(
            slides, theme, batch_index, batch_total, narration_instructions
        )

        content = self._call_ai(prompt, max_tokens=1400, context=f"Generate batch {batch_index}/{batch_total}")
        if not content:
            return self._create_fallback_slides(slides)

        return self._sanitize_slide_markdown(content)

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
                comment = CommentProcessor.build_slide_narration(
                    heading=heading,
                    focus=focus,
                    index=idx,
                    total=len(blocks),
                    prev_heading=prev_heading,
                    next_heading=next_heading
                )

            fallback_comment = CommentProcessor.build_slide_narration(
                heading=heading,
                focus=focus,
                index=idx,
                total=len(blocks),
                prev_heading=prev_heading,
                next_heading=next_heading
            )
            comment = CommentProcessor.enforce_comment_length(
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
