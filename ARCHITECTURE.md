# Architecture

## System Overview

The Marp Presentation Builder is a full-stack application that enables users to create, edit, and export presentations using Markdown with a WYSIWYG interface.

## Components

### 1. Backend (FastAPI)

**Technology**: Python 3.13+, FastAPI, Pydantic

**Responsibilities**:
- RESTful API for presentation management
- Marp CLI integration for rendering
- File-based storage for presentations
- Theme management
- Export functionality (PDF, HTML, PPTX)

**Key Modules**:
- `app/core/`: Configuration, logging
- `app/api/routes/`: API endpoints
- `app/schemas/`: Pydantic data models
- `app/services/`: Business logic layer
  - `ai/`: Modular AI service package (see below)
  - `comment_processor.py`: Comment length enforcement and narration
  - `video_export_service.py`: Video export pipeline (TTS + slides)
  - `presentation_service.py`: CRUD operations
  - `folder_service.py`: Folder organization
- `app/models/`: Database models (SQLAlchemy)

**AI Service Architecture** (`app/services/ai/`):
- `client.py`: Azure Anthropic client with streaming support
- `models.py`: SlideOutline, PresentationOutline, BatchProgress
- `text_utils.py`: JSON extraction, markdown sanitization
- `outline_generator.py`: Batched outline generation for large presentations
- `content_generator.py`: Viewport-aware content generation (no comments)
- `commentary_generator.py`: Audio-aware TTS commentary (separate from content)
- `slide_operations.py`: Rewrite, layout, restyle, simplify, expand, split
- `image_generator.py`: DALL-E image generation
- `theme_generator.py`: CSS theme generation
- `service.py`: Unified facade composing all generators

**Data Storage**:
- File system: Markdown files (.md) for presentation content
- JSON files: Metadata (title, theme, timestamps)
- SQLite: (Future) For enhanced querying and relationships

### 2. Frontend (React + TypeScript)

**Technology**: React 18+, TypeScript, Vite, Tailwind CSS

**Responsibilities**:
- WYSIWYG editor interface
- Live preview of presentations
- Theme selector
- Export controls
- API integration

**Key Components**:
- Editor: Monaco for Markdown editing with syntax highlighting
- Preview: Iframe-based Marp rendering with live updates
- Theme Selector: Visual theme picker and custom theme creator
- Presentation Sidebar: Hierarchical folder tree with drag-drop
- AI Generation Modal: Multi-step presentation generation workflow
- Asset Manager: Upload and manage logos/images

**Key Utilities**:
- `lib/dragDropValidation.ts`: Type-safe drag-drop data validation
- `hooks/usePresentations.ts`: Presentation CRUD operations
- `hooks/useApiHandler.ts`: Centralized API error handling

**State Management**:
- TanStack Query for server state
- React Context/Zustand for local state

### 3. CLI (Typer + Rich)

**Technology**: Python 3.13+, Typer, Rich

**Responsibilities**:
- Command-line interface for quick operations
- Project scaffolding
- Export automation
- Server launching

**Commands**:
- `marpify init`: Create new presentation project
- `marpify export`: Export to various formats
- `marpify serve`: Launch web UI

## Data Flow

### Presentation Creation

```
User (Frontend)
  → POST /api/presentations
  → PresentationService.create()
  → File System (data/presentations/)
  → Response (PresentationResponse)
  → Frontend Update
```

### Live Preview

```
User edits Markdown
  → Debounced API call
  → GET /api/presentations/{id}/preview
  → MarpService.render_to_html()
  → Marp CLI execution
  → HTML response
  → Iframe render
```

### Export

```
User clicks Export
  → POST /api/presentations/{id}/export
  → MarpService.render_to_pdf()
  → Marp CLI (--pdf)
  → File download
```

## Design Principles

### SOLID

1. **Single Responsibility**: Each service handles one domain
   - `presentation_service.py`: Presentation CRUD
   - `marp_service.py`: Marp rendering
   - `theme_service.py`: Theme management

2. **Open/Closed**: Extensible via plugins/themes without modifying core

3. **Liskov Substitution**: Service interfaces are interchangeable

4. **Interface Segregation**: Small, focused API endpoints

5. **Dependency Inversion**: Services depend on abstractions (Pydantic schemas)

### DRY

- Shared Pydantic models prevent duplication
- Reusable utility functions for file operations
- Common error handling patterns

### Code Quality

- Functions around 10 lines (strong preference, not strict)
- Type hints throughout (Python + TypeScript)
- Self-documenting code (minimal comments)
- Separation of concerns via dedicated modules
- Comprehensive test coverage

### Recent Refactoring (2026-01)

**Backend**:
- Extracted `CommentProcessor` class from `ai_service.py` for better testability
- Split `export_video()` into stage functions: `_prepare_presentation()`, `_generate_video_segments()`, `_finalize_export()`
- Reduced function complexity and improved error handling

**Frontend**:
- Added type-safe drag-drop validation utility (`dragDropValidation.ts`)
- Replaced unsafe `JSON.parse` with validated `parseDragData()`
- Created helper functions: `createPresentationDragData()`, `createFolderDragData()`

### Large Presentation Scaling (2026-01-16)

**Backend AI Refactoring**:
- Split monolithic `ai_service.py` into modular `app/services/ai/` package
- Added batched outline generation for presentations >15 slides
- Content generation now batched with full outline context for coherence
- Commentary generation separated from content (on-demand, audio-aware)
- Added viewport constraints to prevent slide content overflow
- Streaming support added for future chat UI integration

**New API Endpoints**:
- `POST /api/ai/generate-commentary`: Audio-aware commentary in batches
- `POST /api/ai/slide-operation`: Layout, restyle, simplify, expand, split

**Frontend Enhancements**:
- Per-slide quick operation buttons (layout, simplify, expand, split)
- "Generate Commentary" button for on-demand audio notes
- Commentary formatted for TTS (no markdown, expanded abbreviations)

## Security Considerations

1. **API Security**:
   - CORS configuration
   - Input validation via Pydantic
   - SQL injection prevention (when DB added)

2. **File Storage**:
   - UUIDs prevent path traversal
   - Content validation before rendering

3. **Secrets Management**:
   - `.env` for sensitive data
   - Never commit secrets to git

## Scalability

### Current (MVP)

- File-based storage
- Single-instance deployment
- Synchronous rendering

### Future Enhancements

1. **Database**: PostgreSQL for better querying
2. **Caching**: Redis for rendered previews
3. **Queue**: Celery for async exports
4. **CDN**: Static asset serving
5. **Auth**: JWT-based user authentication
6. **Multi-tenancy**: Isolated user workspaces

### Streaming-Ready Architecture

The AI service is designed to support streaming responses for future chat UI:

1. **AIClient.stream()**: Generator-based streaming from Anthropic API
2. **BatchProgress model**: Tracks batch completion for progress updates
3. **Modular generators**: Each can be extended with streaming variants
4. **SSE-ready**: Endpoints can be converted to Server-Sent Events

Future chat UI integration:
- WebSocket or SSE endpoint for incremental slide generation
- Thinking output exposure for transparency
- Agentic workflow with Claude Agent SDK v2

## Deployment Architecture

### Development

```
Docker Compose:
  - backend (port 8000, hot-reload)
  - frontend-dev (port 5173, Vite dev server)
  - (volumes for code changes)
```

### Production

```
Docker Compose:
  - backend (port 8000, production mode)
  - frontend (port 3000, Nginx + built assets)
  - (health checks enabled)
```

### Future (Kubernetes)

```
Services:
  - API pods (horizontal scaling)
  - Frontend (static CDN)
  - Worker pods (export processing)
  - PostgreSQL StatefulSet
  - Redis for caching
```

## API Design

### RESTful Principles

- Resource-based URLs
- HTTP methods semantics
- JSON payloads
- Standard status codes

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /health | Health check |
| POST | /api/presentations | Create presentation |
| GET | /api/presentations | List all |
| GET | /api/presentations/{id} | Get one |
| PUT | /api/presentations/{id} | Update |
| DELETE | /api/presentations/{id} | Delete |
| GET | /api/presentations/{id}/preview | Live preview |
| POST | /api/presentations/{id}/export | Export |
| GET | /api/themes | List themes |
| POST | /api/themes | Upload theme |
| POST | /api/ai/generate-outline | Generate outline (batched) |
| POST | /api/ai/generate-content | Generate slides (no comments) |
| POST | /api/ai/generate-commentary | Generate audio-aware comments |
| POST | /api/ai/slide-operation | Layout/restyle/simplify/expand/split |
| POST | /api/ai/rewrite-slide | Custom rewrite instruction |
| GET | /api/ai/status | AI service availability |

## Testing Strategy

### Backend

- Unit tests: Service logic
- Integration tests: API endpoints
- Mocking: External Marp CLI calls

### Frontend

- Component tests: React Testing Library
- E2E tests: Playwright/Cypress
- API mocking: MSW

### CLI

- Command tests: Typer CliRunner
- Output validation: Rich capture

## Monitoring & Logging

### Logging (Loguru)

- Structured logs to `logs/app.log`
- Rotation: 500 MB
- Retention: 10 days
- Levels: DEBUG, INFO, ERROR

### Future Monitoring

- Prometheus metrics
- Grafana dashboards
- Sentry error tracking
- Performance APM

## Technology Choices Rationale

| Technology | Why Chosen |
|------------|------------|
| FastAPI | Modern, fast, auto-docs, type safety |
| Pydantic | Validation, serialization, type hints |
| React | Component-based, ecosystem, performance |
| TypeScript | Type safety, developer experience |
| Tailwind CSS | Utility-first, rapid development |
| uv | Fast Python package management |
| Marp | Markdown-first, theme support |
| Docker | Consistent environments, easy deployment |
