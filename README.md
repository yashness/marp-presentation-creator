# Marp Presentation Builder

A modern, full-featured presentation builder combining Markdown simplicity (Marp) with WYSIWYG editing capabilities, themes, and branding.

## Features

- **WYSIWYG Editor**: Split view with Markdown editor and live preview
- **Marp Integration**: Full support for Marp presentation syntax
- **Export**: Export to PDF, HTML, and PPTX formats
- **Batch Export**: Export multiple presentations at once
- **Search & Filter**: Search presentations by title/content and filter by theme
- **Theme System**: 3 built-in themes (default, corporate, academic) with custom theme support
- **CLI Tools**: Command-line interface for quick operations
- **REST API**: FastAPI backend for presentation management with 100% test coverage
- **Performance**: Rate limiting and intelligent caching for optimal performance
- **Modern Frontend**: React + TypeScript + Tailwind CSS

## Technology Stack

### Backend
- FastAPI (Python 3.13+)
- Pydantic for type validation
- Loguru for logging
- uv for dependency management
- Marp CLI for presentation rendering

### Frontend
- React 18+ with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Monaco Editor for code editing
- TanStack Query for API state management

### CLI
- Typer for CLI framework
- Rich for beautiful terminal output

## Prerequisites

- Python 3.13+
- Node.js 20+
- Docker (optional, for containerized deployment)
- uv (Python package manager)

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd marp-presentation-creator
```

### 2. Backend Setup

```bash
cd backend

# Create .env file
cp .env.example .env

# Install dependencies
uv sync

# Run the backend
uv run uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. CLI Setup

```bash
cd cli

# Install dependencies
uv sync

# Install CLI globally (optional)
uv pip install -e .

# Run CLI
uv run marpify --help
```

## Docker Deployment

### Development Mode (with hot-reload)

```bash
docker-compose --profile dev up
```

- Backend: `http://localhost:8000`
- Frontend (dev): `http://localhost:5173`

### Production Mode

```bash
docker-compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

## Usage

### API Examples

#### Create a Presentation

```bash
curl -X POST http://localhost:8000/api/presentations \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Presentation",
    "content": "---\nmarp: true\n---\n\n# Hello World\n\n---\n\n## Slide 2\n\nContent here"
  }'
```

#### List All Presentations

```bash
curl http://localhost:8000/api/presentations
```

#### Search Presentations

```bash
# Search by title or content
curl "http://localhost:8000/api/presentations?query=python"

# Filter by theme
curl "http://localhost:8000/api/presentations?theme_id=corporate"

# Combine search and filter
curl "http://localhost:8000/api/presentations?query=tutorial&theme_id=academic"
```

#### Get a Specific Presentation

```bash
curl http://localhost:8000/api/presentations/{id}
```

#### Preview Presentation

```bash
curl http://localhost:8000/api/presentations/{id}/preview
```

#### Export Presentation

```bash
# Export to PDF (default)
curl -X POST "http://localhost:8000/api/presentations/{id}/export?format=pdf" --output presentation.pdf

# Export to HTML
curl -X POST "http://localhost:8000/api/presentations/{id}/export?format=html" --output presentation.html

# Export to PPTX
curl -X POST "http://localhost:8000/api/presentations/{id}/export?format=pptx" --output presentation.pptx
```

#### Batch Export Presentations

```bash
# Export multiple presentations at once
curl -X POST http://localhost:8000/api/presentations/batch/export \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_ids": ["id1", "id2", "id3"],
    "format": "pdf"
  }'
```

#### List Available Themes

```bash
curl http://localhost:8000/api/themes
```

#### Get Theme Details

```bash
curl http://localhost:8000/api/themes/default
curl http://localhost:8000/api/themes/corporate
curl http://localhost:8000/api/themes/academic
```

### CLI Examples

#### Initialize a New Project

```bash
marpify init my-presentation
marpify init slides --template corporate
marpify init -t academic lecture
```

#### Export a Presentation

```bash
marpify export slides.md
marpify export slides.md -f html
marpify export slides.md --format pptx -o output.pptx
```

#### Launch Web UI

```bash
marpify serve
marpify serve --port 3000
marpify serve -p 8080 --no-open
```

## Project Structure

```
marp-presentation-creator/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Config, logger
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── tests/              # Backend tests
│   └── logs/               # Log files
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   └── api/            # API client
│   └── public/             # Static assets
├── cli/                    # CLI application
│   └── marpify/
│       └── commands/       # CLI commands
├── docker-compose.yml      # Docker orchestration
└── README.md
```

## Development

### Running Tests

#### Backend Tests

```bash
cd backend
uv run pytest
```

#### Frontend Tests

```bash
cd frontend
npm test
```

### Code Quality

This project follows:
- **SOLID principles** for architecture with centralized configuration
- **DRY principle** for code reusability with strategy patterns
- **Functions ≤ 10 lines** for maintainability (100% compliance enforced)
- **Type hints** throughout codebase (100% coverage with Rich Table types)
- **Minimal comments** - self-documenting code
- **100% test coverage** on backend (77 tests including edge cases)
- **CLI test coverage** (20 tests passing)
- **Security testing** for path traversal, injection attacks, and file safety

### Type Checking

```bash
cd backend
.venv/bin/mypy app/ --config-file mypy.ini
```

## Test Coverage

- Backend: 77 tests, 100% coverage
- All tests passing with pytest
- Full coverage includes rate limiting, caching, batch operations, search features, and edge cases
- Edge case tests cover file errors, security vulnerabilities, concurrent access, and error handling

## License

MIT

## Contributing

Contributions welcome! Please read CLAUDE.md for coding standards.
