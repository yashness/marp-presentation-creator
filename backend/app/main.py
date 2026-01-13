from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import presentations, themes
from app.core.config import settings, config
from app.core.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting Marp Builder API")
    yield
    logger.info("Shutting down Marp Builder API")

app = FastAPI(
    title=config["app"]["name"],
    version=config["app"]["version"],
    lifespan=lifespan
)

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

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
