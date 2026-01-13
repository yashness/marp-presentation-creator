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
- `app/models/`: (Future) Database models

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
- Editor: Monaco/CodeMirror for Markdown editing
- Preview: Iframe-based Marp rendering
- Theme Selector: Visual theme picker
- Presentation List: CRUD interface

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

- Functions ≤ 10 lines
- Type hints throughout
- Self-documenting code (minimal comments)
- Comprehensive test coverage

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
