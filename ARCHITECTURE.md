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
- `slide_operations.py`: Rewrite, layout, restyle, simplify, expand, split, duplicate-rewrite
- `layout_guide.py`: CSS layout class definitions with HTML examples for AI
- `image_generator.py`: DALL-E image generation
- `theme_generator.py`: CSS theme generation
- `service.py`: Unified facade composing all generators and PresentationTransformer

**PresentationTransformer** (`app/services/ai/slide_operations.py`):
- `rearrange()`: AI-powered slide reordering for better cohesion
- `transform_style()`: Convert to story/teaching/pitch/workshop/technical/executive styles
- `rewrite_for_topic()`: Rewrite all slides for new topic while preserving structure

**Data Storage**:
- SQLite: Primary database via SQLAlchemy ORM
  - Presentations, Themes, Folders, Assets
  - Chat conversations, Versions, Share links
  - Templates, Video exports, Slide audio
- File system: Binary assets (images, audio, video files)

### 2. Frontend (React + TypeScript)

**Technology**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion (Framer Motion)

**Responsibilities**:
- WYSIWYG editor interface with Monaco
- Live preview of presentations
- Theme selector and Theme Studio
- Export controls (PDF, HTML, PPTX, Video)
- Real-time collaboration
- AI-powered features

**Key Components**:
- `EditorPanel`: Monaco editor for Markdown with syntax highlighting
- `PreviewPanel`: Iframe-based Marp rendering with live updates
- `ThemeStudio`: Visual theme creator with 10 color properties
- `PresentationSidebar`: Hierarchical folder tree with drag-drop
- `AIGenerationModal`: Multi-step presentation generation workflow
- `AIChatPanel`: Streaming AI chat with context support
- `AssetManagerModal`: Upload and manage logos/images
- `VersionHistoryPanel`: Checkpoint and restore versions
- `TemplateLibrary`: 8 built-in presentation templates
- `ShareModal` / `SharedViewer`: Sharing with password protection
- `CollaborationPanel`: Real-time multi-user editing
- `VideoExportButton`: Async video export with TTS

**Key Utilities**:
- `lib/dragDropValidation.ts`: Type-safe drag-drop data validation
- `lib/markdown.ts`: Slide parsing and serialization
- `hooks/usePresentations.ts`: Presentation CRUD operations
- `hooks/useApiHandler.ts`: Centralized API error handling
- `hooks/useUndoRedo.ts`: Undo/redo with keyboard shortcuts
- `hooks/useVersioning.ts`: Checkpoint management
- `hooks/useCollaboration.ts`: WebSocket collaboration

**State Management**:
- React hooks for local state
- Context for toast notifications

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

### New Features (2026-01-16)

**Backend - Agentic Workflows**:
- `app/services/ai/agent.py`: Claude Agent SDK v2 integration
- `PresentationAgent` class with tool-use capabilities
- Available tools: create_slide, update_slide, delete_slide, reorder_slides, apply_theme, generate_image, search_presentation, get_presentation_info
- Streaming and non-streaming endpoints: `/api/agent/run`, `/api/agent/stream`, `/api/agent/status`, `/api/agent/tools`

**Backend - Conversation Persistence**:
- `app/models/chat_conversation.py`: ChatConversation, ChatMessage models
- `app/services/chat_service.py`: CRUD operations for conversations
- API endpoints: `/api/conversations/*` for multi-turn memory beyond session

**Backend - URL Scraping**:
- `app/services/url_scraper_service.py`: Extract content from URLs
- OpenGraph metadata extraction, HTML text extraction
- API endpoint: `POST /api/scraper` for fetching URL content as context

**Backend - Presentation Versioning**:
- `app/models/presentation_version.py`: PresentationVersion model
- `app/services/version_service.py`: Create checkpoints, restore versions
- API endpoints: `/api/versions/*` for undo/checkpointing support

**Frontend Enhancements**:
- Drag-drop support for context files in AI Chat panel
- URL scraping integration when dropping links
- `useUndoRedo` hook for local undo/redo with Cmd/Ctrl+Z shortcuts
- `useVersioning` hook for checkpoint management
- `VersionHistoryPanel` component for version history UI
- History button in header for quick access to versions

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

### Current State

- SQLite database with SQLAlchemy ORM
- Single-instance Docker deployment
- Async video export with job queue
- WebSocket for real-time collaboration

### Future Enhancements

1. **Database**: PostgreSQL for production scaling
2. **Caching**: Redis for rendered previews and sessions
3. **Queue**: Celery/Redis for export processing
4. **CDN**: Static asset and video serving
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

### API Routers

All routes are prefixed with `/api`:

| Router | Purpose |
|--------|---------|
| presentations | CRUD, preview, export, duplicate |
| themes | Theme management and creation |
| folders | Folder organization |
| assets | Image/logo upload and management |
| fonts | Custom font upload and management |
| ai_generation | AI outline, content, layouts, operations |
| chat | Streaming AI chat with SSE |
| tts | Text-to-Speech generation |
| video_export | Async video export with progress |
| versions | Checkpoint and restore |
| conversations | Multi-turn conversation persistence |
| templates | Built-in presentation templates |
| share | Public/private sharing links |
| collaboration | WebSocket real-time editing |
| agent | Claude Agent SDK tool-use |
| scraper | URL content extraction |
| analytics | View tracking and statistics |

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /health | Health check |
| POST | /api/presentations | Create presentation |
| GET | /api/presentations/{id}/preview | Live preview HTML |
| POST | /api/presentations/{id}/export | Export PDF/HTML/PPTX |
| POST | /api/video/{id}/export-async | Start async video export |
| GET | /api/video/job/{id}/progress | Poll video job status |
| POST | /api/ai/generate-outline | Generate presentation outline |
| POST | /api/ai/generate-content | Generate slide content |
| POST | /api/ai/slide-operation | Layout/simplify/expand/split |
| GET | /api/chat/stream | SSE streaming AI chat |
| WS | /api/collab/ws/{id} | WebSocket collaboration |
| POST | /api/share | Create share link |
| POST | /api/versions | Create checkpoint |
| GET | /api/templates | List templates |

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
