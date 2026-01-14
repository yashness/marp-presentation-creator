from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.api.routes import presentations, themes, tts, video_export, ai_generation
from app.core.config import settings, config
from app.core.logger import logger
from app.core.rate_limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    from app.core.database import init_db
    logger.info("Starting Marp Builder API")
    init_db()
    yield
    logger.info("Shutting down Marp Builder API")

app = FastAPI(
    title=config["app"]["name"],
    version=config["app"]["version"],
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(presentations.router, prefix="/api")
app.include_router(themes.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(video_export.router, prefix="/api")
app.include_router(ai_generation.router, prefix="/api")

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
