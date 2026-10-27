"""Single entry point for every LLM call: Groq + OpenRouter (free tiers) via the openai SDK.

Flow for `chat_json` / `vision_json`:
1. Pick the provider/model list for the task (`TASK_ROUTES`), skipping providers with no key.
2. Return a cached answer if any route already answered this exact prompt + schema.
3. Call each route in order: JSON mode, validate with the Pydantic schema, one retry with the
   validation error appended, then fall back to the next route.
4. If every route fails, raise `ProviderUnavailable`; callers then run their offline rules.
"""

import base64
import hashlib
import json
import logging
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar

import openai
from pydantic import BaseModel, ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import SessionLocal
from app.errors import ProviderUnavailable
from app.models.ops import LLMCache
from app.prompts import JSON_ONLY

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

GROQ = "groq"
OPENROUTER = "openrouter"
BASE_URLS = {
    GROQ: "https://api.groq.com/openai/v1",
    OPENROUTER: "https://openrouter.ai/api/v1",
}
TIMEOUT_SECONDS = 30
TEMPERATURE = 0.2  # low: extraction, checks and grounded answers must be repeatable
MAX_ATTEMPTS_PER_ROUTE = 2  # first try + one retry with the validation error


@dataclass(frozen=True)
class ProviderModel:
    """One place a task can be sent: provider name + settings field holding the model ID."""

    provider: str
    model_setting: str

    def model(self, settings: Settings) -> str:
        return str(getattr(settings, self.model_setting))


_GROQ_TEXT = ProviderModel(GROQ, "model_text")
_OR_TEXT = ProviderModel(OPENROUTER, "model_text_fallback")
_OR_VISION = ProviderModel(OPENROUTER, "model_vision")
_GROQ_VISION = ProviderModel(GROQ, "model_vision_fallback")

# Speed-critical tasks go to Groq first; long/creative ones to OpenRouter first (PLAN.md).
TASK_ROUTES: Dict[str, List[ProviderModel]] = {
    "extract": [_GROQ_TEXT, _OR_TEXT],
    "guardian": [_GROQ_TEXT, _OR_TEXT],
    "answer": [_GROQ_TEXT, _OR_TEXT],
    "query": [_GROQ_TEXT, _OR_TEXT],
    "rerank": [_GROQ_TEXT, _OR_TEXT],
    "interview": [_OR_TEXT, _GROQ_TEXT],
    "report": [_OR_TEXT, _GROQ_TEXT],
    "vision": [_OR_VISION, _GROQ_VISION],
}

# Session factory for the cache; tests point it at their in-memory database.
session_factory: Callable[[], Session] = SessionLocal


@lru_cache(maxsize=4)
def _client(provider: str, api_key: str) -> openai.OpenAI:
    """One HTTP client per provider/key, reused across calls (connection pooling)."""
    return openai.OpenAI(base_url=BASE_URLS[provider], api_key=api_key, timeout=TIMEOUT_SECONDS)


def _api_key(provider: str, settings: Settings) -> Optional[str]:
    return settings.groq_api_key if provider == GROQ else settings.openrouter_api_key


def _routes(task: str, settings: Settings) -> List[ProviderModel]:
    if task not in TASK_ROUTES:
        raise ValueError(f"unknown LLM task '{task}'")
    return [r for r in TASK_ROUTES[task] if _api_key(r.provider, settings)]


def _cache_key(model: str, messages: List[Dict[str, Any]], schema: Type[BaseModel]) -> str:
    payload = json.dumps(
        [model, messages, schema.model_json_schema()], sort_keys=True, ensure_ascii=False
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _cache_get(keys: List[str], schema: Type[T]) -> Optional[T]:
    with session_factory() as db:
        for key in keys:
            row = db.get(LLMCache, key)
            if row is not None:
                try:
                    return schema.model_validate_json(row.value)
                except ValidationError:  # schema changed since it was cached
                    continue
    return None


def _cache_put(key: str, model: str, value: BaseModel) -> None:
    """Best effort: a busy database must never fail the request that got a good answer."""
    try:
        with session_factory() as db:
            db.merge(LLMCache(key=key, model=model, value=value.model_dump_json()))
            db.commit()
    except SQLAlchemyError as exc:
        logger.warning("llm cache write skipped: %s", type(exc).__name__)


_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$")


def _parse(content: Optional[str], schema: Type[T]) -> T:
    """Validate model output; tolerates a ```json fence some free models add."""
    return schema.model_validate_json(_FENCE.sub("", content or ""))


def _call_route(
    route: ProviderModel, settings: Settings, messages: List[Dict[str, Any]], schema: Type[T]
) -> T:
    """Call one provider/model with one retry on invalid JSON. Raises on failure."""
    client = _client(route.provider, _api_key(route.provider, settings) or "")
    model = route.model(settings)
    convo = list(messages)
    last_error: Exception = ProviderUnavailable("no attempt made")
    for attempt in range(MAX_ATTEMPTS_PER_ROUTE):
        start = time.perf_counter()
        resp = client.chat.completions.create(
            model=model,
            messages=convo,
            temperature=TEMPERATURE,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content
        usage = getattr(resp, "usage", None)
        logger.info(
            "llm provider=%s model=%s attempt=%d latency_ms=%d tokens=%s",
            route.provider,
            model,
            attempt + 1,
            (time.perf_counter() - start) * 1000,
            getattr(usage, "total_tokens", None),
        )
        try:
            return _parse(content, schema)
        except ValidationError as exc:
            last_error = exc
            convo = convo + [
                {"role": "assistant", "content": content or ""},
                {
                    "role": "user",
                    "content": f"That JSON was invalid: {exc}. Reply again with "
                    "corrected JSON only.",
                },
            ]
    raise last_error


def _run(task: str, messages: List[Dict[str, Any]], schema: Type[T]) -> T:
    settings = get_settings()
    routes = _routes(task, settings)
    if not routes:
        raise ProviderUnavailable("no API key configured for any provider of task " + task)
    keys = [_cache_key(r.model(settings), messages, schema) for r in routes]
    cached = _cache_get(keys, schema)
    if cached is not None:
        logger.info("llm task=%s cache_hit=true", task)
        return cached
    for route, key in zip(routes, keys):
        try:
            result = _call_route(route, settings, messages, schema)
        except (openai.OpenAIError, ValidationError) as exc:
            logger.warning(
                "llm task=%s provider=%s failed: %s", task, route.provider, type(exc).__name__
            )
            continue
        _cache_put(key, route.model(settings), result)
        return result
    raise ProviderUnavailable(f"all providers failed for task {task}")


def _system(system: str, schema: Type[BaseModel]) -> str:
    return system + "\n\n" + JSON_ONLY.format(schema=json.dumps(schema.model_json_schema()))


def chat_json(task: str, system: str, user: str, schema: Type[T]) -> T:
    """Ask a text model for JSON matching `schema`.

    Args:
        task: key of TASK_ROUTES (extract, guardian, answer, query, rerank, interview, report).
        system: instructions (from app/prompts).
        user: the user message; wrap any records with prompts.wrap_records().
        schema: Pydantic model the reply must validate against.

    Returns:
        A validated `schema` instance.

    Raises:
        ProviderUnavailable: no key set or every provider failed.
    """
    messages = [
        {"role": "system", "content": _system(system, schema)},
        {"role": "user", "content": user},
    ]
    return _run(task, messages, schema)


def _data_url(image: bytes) -> str:
    mime = "image/png" if image[:8] == b"\x89PNG\r\n\x1a\n" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(image).decode('ascii')}"


def vision_json(task: str, images: List[bytes], prompt: str, schema: Type[T]) -> T:
    """Ask a vision model about images (JPEG/PNG bytes, already resized ≤ 1280 px).

    Raises:
        ProviderUnavailable: no key set or every provider failed.
        ValueError: no images given.
    """
    if not images:
        raise ValueError("vision_json needs at least one image")
    content: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]
    content += [{"type": "image_url", "image_url": {"url": _data_url(img)}} for img in images]
    messages = [
        {"role": "system", "content": _system("You read images from a machine shop.", schema)},
        {"role": "user", "content": content},
    ]
    return _run(task, messages, schema)
