# Marp Presentation Builder - Project Plan

## Vision
A modern, full-featured presentation builder combining Markdown simplicity (Marp) with WYSIWYG editing capabilities, themes, and branding.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **Package Manager**: uv
- **Type System**: Pydantic v2
- **Configuration**: config.toml (tomli/tomllib)
- **Secrets**: python-dotenv
- **Logging**: loguru (logs to `logs/` folder)
- **Testing**: pytest
- **Presentation Engine**: Marp CLI / marp-core

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Editor**: Monaco Editor / CodeMirror with live preview
- **State Management**: Zustand / React Context
- **API Client**: TanStack Query (React Query)

### CLI
- **Framework**: typer
- **UI/Output**: rich
- **Features**: Generate, preview, export, theme management

## Core Features

### 1. Markdown Editor with WYSIWYG
- Split view: Markdown source + live preview
- Real-time Marp rendering
- Syntax highlighting
- Auto-save functionality

### 2. Presentation Management
- Create, edit, delete presentations
- Template library
- Export to PDF, HTML, PPTX
- Version history (git-based)

### 3. Theme & Branding System
- Custom CSS themes
- Built-in theme library (default, gaia, uncover, etc.)
- Brand color palette management
- Logo/image asset management
- Font customization

### 4. CLI Tools
- `marpify init` - Initialize new presentation
- `marpify create <name>` - Create from template
- `marpify edit <file>` - Open in web UI
- `marpify preview <file>` - Launch preview server
- `marpify export <file> -f <format>` - Export presentation
- `marpify theme list/add/remove` - Theme management
- `marpify serve` - Launch web UI server

### 5. API Endpoints
- `POST /api/presentations` - Create presentation
- `GET /api/presentations` - List all
- `GET /api/presentations/{id}` - Get specific
- `PUT /api/presentations/{id}` - Update
- `DELETE /api/presentations/{id}` - Delete
- `POST /api/presentations/{id}/export` - Export
- `GET /api/themes` - List themes
- `POST /api/themes` - Upload custom theme
- `GET /api/preview/{id}` - Live preview endpoint

## Architecture Principles

### SOLID Principles
- **S**: Single Responsibility - Each module handles one concern
- **O**: Open/Closed - Extensible themes/plugins without modifying core
- **L**: Liskov Substitution - Interchangeable exporters/renderers
- **I**: Interface Segregation - Specific interfaces for editors/viewers/exporters
- **D**: Dependency Inversion - Abstract presentation engine interface

### DRY Principle
- Shared utilities for file operations
- Reusable theme configuration parser
- Common validation logic via Pydantic models

### Code Standards
- Functions: Max 10 lines
- Type hints: Required (Pydantic models)
- Comments: Minimal, self-documenting code
- Testing: Every feature validated with pytest

## Project Structure

```
marp-builder/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   └── dependencies.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── logger.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── presentation.py
│   │   │   └── theme.py
│   │   ├── services/
│   │   │   ├── marp_service.py
│   │   │   ├── export_service.py
│   │   │   └── theme_service.py
│   │   ├── schemas/
│   │   └── main.py
│   ├── tests/
│   ├── logs/
│   ├── config.toml
│   ├── .env.example
│   ├── pyproject.toml
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   ├── preview/
│   │   │   └── ui/ (shadcn)
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── api/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── cli/
│   ├── marpify/
│   │   ├── commands/
│   │   ├── utils/
│   │   └── main.py
│   ├── tests/
│   └── pyproject.toml
├── themes/
│   ├── default/
│   ├── corporate/
│   └── academic/
├── ARCHITECTURE.md
├── PRD.md
├── TASKS.md
└── README.md
```

## Development Phases

### Phase 1: Foundation (Core Setup)
- Initialize uv project structure
- Configure git repository
- Set up FastAPI backend skeleton
- Initialize Vite React frontend
- Configure loguru, config.toml, .env

### Phase 2: Backend Services
- Implement Marp integration service
- Build presentation CRUD operations
- Create export service (PDF, HTML)
- Theme management service
- API route implementation

### Phase 3: Frontend UI
- Set up shadcn/ui + Tailwind
- Build markdown editor component
- Implement live preview with Marp
- Create presentation list/management UI
- Theme selector interface

### Phase 4: CLI Development
- Implement typer-based CLI
- Add all core commands with examples
- Integrate with backend API
- Rich output formatting

### Phase 5: Theme System
- Build theme parser and validator
- Implement custom CSS injection
- Create default theme library
- Brand color palette UI

### Phase 6: Testing & Validation
- Write comprehensive pytest tests
- E2E testing with frontend
- CLI command validation
- Performance testing

### Phase 7: Documentation
- Complete README with setup instructions
- API documentation
- CLI examples and usage
- Architecture documentation

## Success Criteria
- ✅ Create presentation from Markdown via UI/CLI
- ✅ Live WYSIWYG preview while editing
- ✅ Export to PDF, HTML, PPTX
- ✅ Apply and customize themes
- ✅ All tests passing
- ✅ Clean, maintainable code following principles
- ✅ Complete documentation
