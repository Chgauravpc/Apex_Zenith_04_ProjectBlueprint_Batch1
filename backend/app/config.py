"""Application settings loaded from environment variables / `.env`.

Only this module reads configuration. Everything else gets a `Settings`
instance through `get_settings()` (or `Depends(get_settings)` in routers).
"""

from functools import lru_cache
from typing import Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Field names map to upper-case env vars (e.g. GROQ_API_KEY)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    groq_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None

    # Model IDs per task. Free-tier IDs change often, so they live in .env.
    model_text: str = "openai/gpt-oss-120b"
    model_text_fallback: str = "nvidia/nemotron-3.5-lightning:free"
    model_vision: str = "nvidia/nemotron-3.5-super-vl:free"
    model_vision_fallback: str = "qwen/qwen3.8-27b"
    model_stt: str = "whisper-large-v3"

    database_url: str = "sqlite:///./blueprint.db"
    storage_dir: str = "storage"
    # Where card vectors come from: "cloudflare" (Workers AI bge-m3, free plan, no torch),
    # "local" (e5-small in-process, needs torch, ~500 MB RAM) or "off" (keyword search only).
    # Changing it makes stored vectors stale; the startup backfill re-embeds them.
    embedding_provider: Literal["cloudflare", "local", "off"] = "local"
    cf_account_id: Optional[str] = None
    cf_api_token: Optional[str] = None  # needs the "Workers AI" permission
    frontend_origin: str = "http://localhost:5173"
    erp_base_url: str = "http://localhost:8001"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings, parsed once."""
    return Settings()
