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
- Export to PDF, HTML, and PPTX formats

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
