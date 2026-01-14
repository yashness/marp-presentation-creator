# Marp Presentation Builder

A presentation builder that combines Markdown (Marp) with a visual editing experience, exports, and a theme system.

## What This Is
- A full‑stack app for creating Marp presentations.
- A UI for editing, previewing, and exporting slides.
- A backend API + CLI for programmatic workflows.

## What We Care About
- Reliability of preview/export.
- Clear, observable backend behavior.
- UI that is wide, slick, and cohesive with a two‑color theme and icons.
- Documentation that reflects reality and priorities.

## Primary Surfaces
- UI: web app for editing, previewing, exporting.
- API: JSON endpoints for presentation operations.
- CLI: quick access to common tasks.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn-style components, lucide-react icons, Monaco Editor
- **Backend**: FastAPI, SQLAlchemy (SQLite), Marp CLI
- **Infrastructure**: Docker, Docker Compose, Nginx
- **Testing**: pytest (backend), Playwright (UI)

## UI Features
- Wide, modern layout with sidebar, editor, and preview panel
- Two-color theme: sky blue (primary) and purple (secondary) with gradient backgrounds
- Custom shadcn-style components for consistent styling
- Icons throughout the interface (lucide-react)
- Monaco editor for Markdown editing
- Real-time preview with Marp rendering
- Export to PDF, HTML, PPTX, and MP4 video formats

## AI-Powered Features
- **AI Presentation Generation**: Generate complete presentations from a description using Claude AI
- **Outline Editor**: Edit and reorganize AI-generated outlines with inline editing and drag-drop
- **AI Text Rewriting**: Improve or modify slide content with AI assistance
- **AI Image Generation**: Create custom images with DALL-E 3 for your presentations
- **Command Palette**: Quick access to AI features with Cmd/Ctrl+K keyboard shortcut
- **Text-to-Speech**: Generate audio narration for slide comments with Kokoro TTS
- **Video Export**: Combine slides with AI-generated narration into MP4 videos

## Configuration

### Azure AI Services (Optional)
To enable AI features, create a `.env` file in the project root with your Azure credentials:

```bash
AZURE_ENDPOINT=https://your-resource.openai.azure.com/anthropic
AZURE_DEPLOYMENT=claude-haiku-4-5
AZURE_IMAGE_DEPLOYMENT=dall-e-3
API_KEY=your-azure-api-key
```

The application will work without these credentials, but AI features will be disabled.

## Quick Start

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Development

```bash
# Rebuild frontend after changes
bash scripts/rebuild-frontend.sh

# Test API endpoints
bash scripts/test-api.sh

# Validate UI with Playwright
python3 scripts/validate-ui.py

# Run full validation (API + UI + screenshots)
bash scripts/validate-all.sh
```

See [VALIDATION.md](./VALIDATION.md) for detailed validation steps.

## Quality Expectations
- Validate via API calls, Docker logs, and Playwright UI flows.
- Take screenshots for visual checks.
- Keep `todo.md` aligned with current progress.
