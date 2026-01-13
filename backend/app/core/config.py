import tomllib
from pathlib import Path
from pydantic import ConfigDict
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    database_url: str = "sqlite:///./marp_builder.db"
    api_secret_key: str
    cors_origins: str = "http://localhost:3000"
    marp_cli_path: str = "marp"

def load_toml_config() -> dict:
    config_path = Path(__file__).parent.parent.parent / "config.toml"
    with config_path.open("rb") as f:
        return tomllib.load(f)

settings = Settings()
config = load_toml_config()
