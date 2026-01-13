# Full Stack Development Best Practices

## Core Principles

### SOLID Principles
- **Single Responsibility**: Each class/function handles one specific task
- **Open/Closed**: Code is open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable for base classes
- **Interface Segregation**: Many specific interfaces > one general interface
- **Dependency Inversion**: Depend on abstractions, not concretions

### DRY Principle
- Don't Repeat Yourself
- Extract common logic into reusable functions/classes
- Use inheritance and composition appropriately
- Avoid code duplication across modules

## Code Standards

### Function Length
- **Maximum 10 lines per function**
- Break complex logic into smaller helper functions
- Extract conditionals and loops into named functions
- Prefer composition over long procedural code

Example:
```python
# ❌ Bad - Too long
def process_user_data(user_id: int) -> dict:
    user = db.get_user(user_id)
    if user is None:
        raise ValueError("User not found")
    profile = db.get_profile(user_id)
    if profile is None:
        profile = create_default_profile(user_id)
    settings = db.get_settings(user_id)
    if settings is None:
        settings = create_default_settings(user_id)
    return {"user": user, "profile": profile, "settings": settings}

# ✅ Good - Split into focused functions
def get_user_data(user_id: int) -> dict:
    user = fetch_user(user_id)
    profile = fetch_or_create_profile(user_id)
    settings = fetch_or_create_settings(user_id)
    return build_user_response(user, profile, settings)

def fetch_user(user_id: int) -> User:
    user = db.get_user(user_id)
    if not user:
        raise ValueError("User not found")
    return user
```

### Type Hints & Pydantic
- **Use Pydantic heavily for all data models**
- Type hints required for all function signatures
- Leverage Pydantic's validation features
- Use `pydantic.BaseModel` for structured data

Example:
```python
from pydantic import BaseModel, Field, validator

class PresentationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str
    theme_id: str | None = None

    @validator("content")
    def validate_markdown(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Content cannot be empty")
        return v

class PresentationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

### Comments
- **Minimal comments** - code should be self-documenting
- Use descriptive variable and function names
- Comments only for complex algorithms or non-obvious logic
- Avoid redundant comments that repeat what code does

```python
# ❌ Bad - Redundant comment
# Get the user from database
user = db.get_user(user_id)

# ✅ Good - No comment needed, clear naming
user = fetch_user_by_id(user_id)

# ✅ Good - Comment for non-obvious logic
# Debounce prevents excessive API calls during typing
debounced_save = debounce(save_presentation, delay=500)
```

## Configuration Management

### Secrets with python-dotenv
- Store sensitive data in `.env` file (never commit!)
- Load via `python-dotenv` at app startup
- Provide `.env.example` template

```python
# .env
DATABASE_URL=postgresql://user:pass@localhost/db
API_SECRET_KEY=super-secret-key-here
MARP_CLI_PATH=/usr/local/bin/marp

# .env.example
DATABASE_URL=postgresql://user:pass@localhost/db
API_SECRET_KEY=your-secret-key
MARP_CLI_PATH=/path/to/marp
```

```python
# app/core/config.py
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    database_url: str
    api_secret_key: str
    marp_cli_path: str

    class Config:
        env_file = ".env"

settings = Settings()
```

### Configurables with config.toml
- Non-sensitive configuration in `config.toml`
- Load with `tomli` (Python <3.11) or `tomllib` (Python 3.11+)
- Structured configuration with sections

```toml
# config.toml
[app]
name = "Marp Builder"
version = "1.0.0"
debug = false

[server]
host = "0.0.0.0"
port = 8000
workers = 4

[logging]
level = "INFO"
format = "{time} | {level} | {message}"
rotation = "500 MB"

[marp]
default_theme = "default"
export_formats = ["pdf", "html", "pptx"]
```

```python
# app/core/config.py
import tomllib
from pathlib import Path

def load_config() -> dict:
    config_path = Path("config.toml")
    with config_path.open("rb") as f:
        return tomllib.load(f)

config = load_config()
```

## Logging with Loguru

### Setup
```python
# app/core/logger.py
from loguru import logger
import sys
from pathlib import Path

def setup_logger():
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    logger.remove()
    logger.add(
        sys.stderr,
        level="INFO",
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>"
    )
    logger.add(
        log_dir / "app.log",
        rotation="500 MB",
        retention="10 days",
        level="DEBUG",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
    )

    return logger

logger = setup_logger()
```

### Usage
```python
from app.core.logger import logger

def create_presentation(data: PresentationCreate):
    logger.info(f"Creating presentation: {data.title}")
    try:
        presentation = save_to_db(data)
        logger.debug(f"Presentation saved with ID: {presentation.id}")
        return presentation
    except Exception as e:
        logger.error(f"Failed to create presentation: {e}")
        raise
```

## CLI with Typer & Rich

### Typer Setup
```python
# cli/marpify/main.py
import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(
    help="Marp Presentation Builder CLI",
    add_completion=False
)
console = Console()

@app.command(help="Initialize a new presentation project")
def init(
    name: str = typer.Argument(..., help="Project name"),
    template: str = typer.Option("default", "--template", "-t", help="Template to use")
):
    """
    Initialize a new presentation project.

    Examples:
        marpify init my-presentation
        marpify init slides --template corporate
        marpify init -t academic lecture
    """
    console.print(f"[green]Creating project: {name}[/green]")
    # Implementation...

@app.command(help="Export presentation to various formats")
def export(
    file: str = typer.Argument(..., help="Presentation file"),
    format: str = typer.Option("pdf", "--format", "-f", help="Export format (pdf, html, pptx)"),
    output: str = typer.Option(None, "--output", "-o", help="Output file path")
):
    """
    Export presentation to PDF, HTML, or PPTX.

    Examples:
        marpify export slides.md
        marpify export slides.md -f html
        marpify export slides.md --format pptx -o output.pptx
    """
    # Implementation...
```

### Rich Formatting
```python
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

def list_themes():
    table = Table(title="Available Themes")
    table.add_column("Name", style="cyan")
    table.add_column("Description", style="green")
    table.add_row("default", "Clean and minimal")
    table.add_row("corporate", "Professional business style")
    console.print(table)

def export_with_progress(file: str):
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Exporting to PDF...", total=None)
        # Export logic...
        progress.update(task, completed=True)
```

### Help & Shorthand
- Every option must have both `--long` and `-short` form
- Add comprehensive help text with examples
- Use `help` parameter in `@app.command()`

## API with FastAPI

### Structure
```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import presentations, themes
from app.core.logger import logger

app = FastAPI(title="Marp Builder API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(presentations.router, prefix="/api")
app.include_router(themes.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

### Routes
```python
# app/api/routes/presentations.py
from fastapi import APIRouter, HTTPException
from app.schemas.presentation import PresentationCreate, PresentationResponse
from app.services.presentation_service import PresentationService

router = APIRouter(prefix="/presentations", tags=["presentations"])
service = PresentationService()

@router.post("", response_model=PresentationResponse)
def create(data: PresentationCreate):
    logger.info(f"Creating presentation: {data.title}")
    return service.create(data)

@router.get("/{id}", response_model=PresentationResponse)
def get_one(id: str):
    presentation = service.get_by_id(id)
    if not presentation:
        raise HTTPException(404, "Not found")
    return presentation
```

## Testing with Pytest

### Structure
```
tests/
├── conftest.py          # Fixtures
├── test_config.py
├── test_marp_service.py
├── test_presentation_service.py
└── test_api_presentations.py
```

### Fixtures
```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_presentation():
    return {
        "title": "Test Presentation",
        "content": "# Slide 1\nContent here"
    }
```

### Tests
```python
# tests/test_api_presentations.py
def test_create_presentation(client, sample_presentation):
    response = client.post("/api/presentations", json=sample_presentation)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == sample_presentation["title"]

def test_get_presentation(client):
    # Create first
    create_resp = client.post("/api/presentations", json={...})
    pres_id = create_resp.json()["id"]

    # Then get
    response = client.get(f"/api/presentations/{pres_id}")
    assert response.status_code == 200
```

## Git Practices

### Configuration
```bash
git config user.name "Yash Shah"
git config user.email "yash9414@gmail.com"
```

### Commits
- Commit incrementally, not all at once
- Clear, concise commit messages
- **DO NOT** sign with "Co-Authored-By: Claude Sonnet" or similar
- Use conventional commits format:

```
feat: add theme selector component
fix: resolve export PDF rendering issue
refactor: extract marp service helpers
test: add presentation CRUD tests
docs: update README with setup instructions
```

### What NOT to Commit
- ❌ `.env` files (use `.env.example` instead)
- ❌ Unnecessary markdown summary files
- ❌ `logs/` directory
- ❌ `__pycache__/`, `.pytest_cache/`
- ❌ `node_modules/`
- ❌ Build artifacts

### .gitignore
```
# Python
__pycache__/
*.py[cod]
.pytest_cache/
.venv/
*.egg-info/

# Logs
logs/
*.log

# Environment
.env
.env.local

# Frontend
node_modules/
dist/
.vite/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
```

## Project Documentation

### Acceptable Files
- ✅ `README.md` - Setup and usage instructions
- ✅ `ARCHITECTURE.md` - System design documentation
- ✅ `PRD.md` - Product requirements document
- ✅ `TASKS.md` - Detailed task breakdown (for longer projects)

### NOT Acceptable
- ❌ `SUMMARY.md`
- ❌ `NOTES.md`
- ❌ `CHANGELOG.md` (unless explicitly required)
- ❌ Random markdown files for every feature

## Scaffolding with CLI Tools

### Use uv for Python Projects
```bash
# Initialize project
uv init backend
cd backend

# Add dependencies (updates pyproject.toml)
uv add fastapi uvicorn pydantic python-dotenv loguru

# Add dev dependencies
uv add --dev pytest pytest-cov

# Sync dependencies
uv sync

# Run commands
uv run uvicorn app.main:app --reload
uv run pytest
```

### Use npm/pnpm for Frontend
```bash
# Create Vite project
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install dependencies
npm install

# Add shadcn/ui
npx shadcn-ui@latest init

# Add components
npx shadcn-ui@latest add button card dialog
```

## Summary Checklist

Before considering any task complete, verify:

- [ ] All functions ≤ 10 lines
- [ ] Pydantic models for all data structures
- [ ] Type hints on all functions
- [ ] Secrets in `.env`, config in `config.toml`
- [ ] Loguru logging to `logs/` directory
- [ ] CLI with typer + rich, help examples, shorthand flags
- [ ] FastAPI for API (if applicable)
- [ ] Minimal code comments, self-documenting code
- [ ] Pytest tests written and passing
- [ ] Git initialized with correct user config
- [ ] Incremental commits with clear messages
- [ ] No unnecessary markdown files
- [ ] README with setup and usage examples
- [ ] SOLID & DRY principles followed
- [ ] Validation by running the application
