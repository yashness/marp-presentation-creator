from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import presentations
from app.core.config import settings, config
from app.core.logger import logger

app = FastAPI(
    title=config["app"]["name"],
    version=config["app"]["version"]
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

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Marp Builder API")
