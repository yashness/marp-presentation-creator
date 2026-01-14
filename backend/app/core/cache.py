from cachetools import TTLCache
import hashlib

def create_render_cache() -> TTLCache[str, str]:
    return TTLCache(maxsize=100, ttl=3600)

def generate_cache_key(content: str, theme_id: str | None) -> str:
    theme_str = theme_id or "default"
    combined = f"{content}{theme_str}"
    return hashlib.md5(combined.encode()).hexdigest()

render_cache: TTLCache[str, str] = create_render_cache()
