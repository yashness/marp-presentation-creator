import tomllib
from pathlib import Path
from typing import Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env")

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./marp_builder.db"
    api_secret_key: str = "dev-secret-key-change-in-production"
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174"
    marp_cli_path: str = "marp"

def load_toml_config() -> dict[str, Any]:
    config_path = Path(__file__).parent.parent.parent / "config.toml"
    with config_path.open("rb") as f:
        return tomllib.load(f)

settings = Settings()
config = load_toml_config()
