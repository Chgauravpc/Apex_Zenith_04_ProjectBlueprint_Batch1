"""Domain exceptions and the single place that turns them into HTTP responses.

Services raise these; routers never build `HTTPException` themselves.
Every error body has the same shape: `{"detail": str, "code": str}`.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for expected, user-facing errors."""

    status_code = 400
    default_code = "app_error"

    def __init__(self, message: str, code: str = "") -> None:
        super().__init__(message)
        self.message = message
        self.code = code or self.default_code


class NotFound(AppError):
    """The requested record does not exist."""

    status_code = 404
    default_code = "not_found"


class ValidationFailed(AppError):
    """Input is well-formed JSON but breaks a business rule (bad file, empty mask, ...)."""

    status_code = 422
    default_code = "validation_failed"


class ProviderUnavailable(AppError):
    """Every configured AI provider failed or no API key is set."""

    status_code = 503
    default_code = "provider_unavailable"


class PayloadTooLarge(AppError):
    """Upload is larger than the limit for its kind."""

    status_code = 413
    default_code = "payload_too_large"


async def _handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    logger.info("%s on %s: %s", exc.code, request.url.path, exc.message)
    return JSONResponse(
        status_code=exc.status_code, content={"detail": exc.message, "code": exc.code}
    )


def register_handlers(app: FastAPI) -> None:
    """Attach the AppError handler to the app (covers all subclasses)."""
    app.add_exception_handler(AppError, _handle_app_error)  # type: ignore[arg-type]
