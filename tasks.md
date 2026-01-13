# TASKS - Marp Presentation Builder

## TASK 1: Project Foundation & Setup
**Goal**: Initialize project structure with proper tooling

### Subtasks:
1. Initialize git repository
   - Configure user: Yash Shah <yash9414@gmail.com>
   - Create .gitignore
   - Initial commit

2. Create backend project with uv
   - Run `uv init backend`
   - Add dependencies: fastapi, uvicorn, pydantic, python-dotenv, loguru, tomli
   - Configure pyproject.toml

3. Create CLI project with uv
   - Run `uv init cli`
   - Add dependencies: typer, rich, httpx

4. Create frontend with Vite
   - Run `npm create vite@latest frontend -- --template react-ts`
   - Install shadcn/ui
   - Install tailwindcss

5. Create Docker configuration
   - backend/Dockerfile
   - frontend/Dockerfile
   - cli/Dockerfile
   - docker-compose.yml

### Validation:
- [ ] Git initialized with correct user config
- [ ] `uv sync` works in backend/
- [ ] `uv sync` works in cli/
- [ ] `npm install` works in frontend/
- [ ] `docker-compose build` succeeds

---

## TASK 2: Backend Core Setup
**Goal**: Set up FastAPI application with logging and configuration

### Subtasks:
1. Create core configuration module
   - app/core/config.py with Pydantic Settings
   - Load from config.toml and .env

2. Set up loguru logger
   - app/core/logger.py
   - Configure file logging to logs/app.log
   - Rotation and retention settings

3. Create FastAPI app skeleton
   - app/main.py with lifespan events
   - CORS middleware
   - Health check endpoint

4. Create base Pydantic models
   - app/models/presentation.py
   - app/models/theme.py

### Validation:
- [ ] `uv run uvicorn app.main:app` starts server
- [ ] GET /health returns 200
- [ ] Logs written to logs/app.log
- [ ] config.toml loads correctly
- [ ] pytest tests/test_config.py passes

---

## TASK 3: Marp Integration Service
**Goal**: Integrate Marp CLI for rendering presentations

### Subtasks:
1. Research Marp CLI installation and usage
   - Check latest @marp-team/marp-cli npm package
   - Understand rendering options

2. Create Marp service
   - app/services/marp_service.py
   - render_to_html() method
   - render_to_pdf() method
   - validate_markdown() method

3. Add Marp CLI to Docker images
   - Install Node.js in backend Dockerfile
   - Install @marp-team/marp-cli globally

4. Create presentation schema
   - app/schemas/presentation.py
   - PresentationCreate, PresentationUpdate, PresentationResponse

### Validation:
- [ ] Marp CLI installed in Docker
- [ ] Test markdown renders to HTML
- [ ] Test markdown renders to PDF
- [ ] pytest tests/test_marp_service.py passes
- [ ] Error handling for invalid markdown works

---

## TASK 4: Presentation CRUD API
**Goal**: Implement full presentation management API

### Subtasks:
1. Create presentation storage service
   - app/services/presentation_service.py
   - Store presentations as .md files
   - Metadata in SQLite/JSON

2. Implement API routes
   - app/api/routes/presentations.py
   - POST /api/presentations
   - GET /api/presentations
   - GET /api/presentations/{id}
   - PUT /api/presentations/{id}
   - DELETE /api/presentations/{id}

3. Add export endpoint
   - POST /api/presentations/{id}/export
   - Support format: pdf, html, pptx

4. Add preview endpoint
   - GET /api/presentations/{id}/preview
   - Returns rendered HTML

### Validation:
- [ ] Create presentation via API
- [ ] List presentations returns all
- [ ] Update presentation works
- [ ] Delete presentation works
- [ ] Export to PDF succeeds
- [ ] Preview renders correctly
- [ ] pytest tests/test_presentations.py passes

---

## TASK 5: Theme Management System
**Goal**: Build comprehensive theme system

### Subtasks:
1. Define theme schema
   - app/schemas/theme.py
   - CSS rules, colors, fonts, assets

2. Create default themes
   - themes/default/style.css
   - themes/corporate/style.css
   - themes/academic/style.css

3. Implement theme service
   - app/services/theme_service.py
   - load_theme() method
   - validate_theme() method
   - apply_theme_to_presentation() method

4. Theme API routes
   - GET /api/themes
   - POST /api/themes (upload custom)
   - GET /api/themes/{id}
   - DELETE /api/themes/{id}

### Validation:
- [ ] List themes returns all built-in themes
- [ ] Upload custom theme works
- [ ] Apply theme to presentation renders correctly
- [ ] Invalid CSS rejected with error
- [ ] pytest tests/test_theme_service.py passes

---

## TASK 6: Frontend - Editor Component
**Goal**: Build markdown editor with syntax highlighting

### Subtasks:
1. Install Monaco Editor
   - `npm install @monaco-editor/react`
   - Configure TypeScript

2. Create Editor component
   - src/components/editor/MarkdownEditor.tsx
   - Syntax highlighting for Marp
   - Auto-save functionality
   - Max 10 lines per function

3. Create editor store
   - src/stores/editorStore.ts (Zustand)
   - Current content, auto-save state

4. Style with Tailwind
   - Dark/light mode support
   - Responsive layout

### Validation:
- [ ] Editor renders and accepts input
- [ ] Syntax highlighting works
- [ ] Auto-save triggers after edits
- [ ] Component tests pass
- [ ] Accessible keyboard navigation

---

## TASK 7: Frontend - Live Preview
**Goal**: Real-time Marp preview component

### Subtasks:
1. Create Preview component
   - src/components/preview/LivePreview.tsx
   - Iframe for rendered HTML
   - Debounced updates

2. Connect to backend API
   - src/api/presentations.ts
   - TanStack Query mutations
   - Preview endpoint integration

3. Create split-view layout
   - src/components/editor/SplitView.tsx
   - Resizable panes
   - Toggle preview on/off

4. Add slide navigation
   - Previous/next slide buttons
   - Slide indicator

### Validation:
- [ ] Preview updates as markdown changes
- [ ] Debouncing prevents excessive renders
- [ ] Split view resizes properly
- [ ] Slide navigation works
- [ ] Preview renders Marp directives correctly

---

## TASK 8: Frontend - Theme Selector
**Goal**: UI for selecting and customizing themes

### Subtasks:
1. Create ThemeSelector component
   - src/components/theme/ThemeSelector.tsx
   - Dropdown with theme previews

2. Create ColorPalette component
   - src/components/theme/ColorPalette.tsx
   - Brand color customization

3. Theme API integration
   - src/api/themes.ts
   - Fetch, apply, upload themes

4. Theme preview modal
   - Show sample slides with theme applied

### Validation:
- [ ] Themes load from API
- [ ] Selecting theme updates preview
- [ ] Custom colors apply correctly
- [ ] Upload custom theme works
- [ ] Theme preview modal displays samples

---

## TASK 9: CLI - Core Commands
**Goal**: Implement all CLI commands with rich output

### Subtasks:
1. Create CLI app structure
   - cli/marpify/main.py
   - typer app with help examples

2. Implement commands:
   - commands/init.py (--help, -h with examples)
   - commands/create.py (--template, -t)
   - commands/edit.py (--browser, -b)
   - commands/preview.py (--port, -p)
   - commands/export.py (--format, -f)
   - commands/theme.py (list/add/remove)
   - commands/serve.py (--port, -p, --host, -h)

3. Add rich formatting
   - Progress bars for exports
   - Tables for theme lists
   - Syntax highlighted output

### Validation:
- [ ] `marpify --help` shows all commands
- [ ] `marpify init myproject` creates structure
- [ ] `marpify create -t corporate slides.md` works
- [ ] `marpify preview slides.md` opens browser
- [ ] `marpify export -f pdf slides.md` creates PDF
- [ ] `marpify theme list` shows themes
- [ ] All commands have shorthand flags
- [ ] pytest tests/test_cli.py passes

---

## TASK 10: Docker & Deployment
**Goal**: Containerize all services

### Subtasks:
1. Create backend Dockerfile
   - Multi-stage build
   - Install Python deps with uv
   - Install Node.js and Marp CLI

2. Create frontend Dockerfile
   - Node.js build stage
   - Nginx serve stage

3. Create docker-compose.yml
   - Backend service on port 8000
   - Frontend service on port 3000
   - Volume mounts for development
   - Environment variables

4. Add health checks
   - Backend healthcheck endpoint
   - Frontend healthcheck

### Validation:
- [ ] `docker-compose build` succeeds
- [ ] `docker-compose up` starts all services
- [ ] Backend accessible at localhost:8000
- [ ] Frontend accessible at localhost:3000
- [ ] API calls from frontend to backend work
- [ ] Marp rendering works in container
- [ ] Logs visible via `docker-compose logs`

---

## TASK 11: Comprehensive Testing
**Goal**: Full test coverage with pytest

### Subtasks:
1. Backend unit tests
   - tests/test_config.py
   - tests/test_marp_service.py
   - tests/test_presentation_service.py
   - tests/test_theme_service.py

2. Backend API tests
   - tests/test_api_presentations.py
   - tests/test_api_themes.py

3. CLI tests
   - tests/test_cli_commands.py

4. Integration tests
   - tests/test_integration.py
   - Full workflow: create → edit → export

### Validation:
- [ ] `uv run pytest backend/tests` - all pass
- [ ] `uv run pytest cli/tests` - all pass
- [ ] Coverage > 80%
- [ ] No failing tests in CI/CD

---

## TASK 12: Documentation & README
**Goal**: Complete documentation for users

### Subtasks:
1. Write README.md
   - Project overview
   - Prerequisites
   - Setup instructions (uv, npm, docker)
   - Usage examples (CLI and API)
   - Screenshots

2. Write ARCHITECTURE.md
   - System design
   - Component interaction
   - Technology choices

3. Write PRD.md
   - Product requirements
   - Features list
   - Use cases

4. API documentation
   - OpenAPI/Swagger via FastAPI
   - Endpoint examples

### Validation:
- [ ] README instructions work from scratch
- [ ] All setup steps verified
- [ ] API examples tested and working
- [ ] CLI examples tested and working
- [ ] Documentation complete and accurate

---

## TASK 13: Final Validation & Polish
**Goal**: End-to-end application testing

### Subtasks:
1. Full workflow test
   - Start with `docker-compose up`
   - Create presentation via UI
   - Edit with WYSIWYG
   - Apply theme
   - Export to PDF, HTML
   - Use CLI for all operations

2. Performance testing
   - Large presentations (100+ slides)
   - Multiple concurrent users

3. Code quality check
   - All functions ≤ 10 lines
   - Type hints complete
   - Minimal comments
   - SOLID/DRY principles followed

4. Git commits
   - Commit incrementally
   - Clear commit messages
   - No unnecessary files

### Validation:
- [ ] Complete presentation creation workflow works
- [ ] Export to all formats succeeds
- [ ] Theme switching works perfectly
- [ ] CLI commands all functional
- [ ] Performance acceptable
- [ ] Code quality standards met
- [ ] Git history clean
- [ ] No unnecessary markdown files committed
