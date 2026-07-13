"""Runtime configuration loaded from environment variables.

`backend/.env` is intended for local development only. Deployment platforms
should provide these values as environment variables instead.
"""

import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


def _required_environment_value(name: str) -> str:
    value = os.getenv(name)
    if value:
        return value
    raise RuntimeError(
        f"{name} is not configured. Create backend/.env from backend/.env.example "
        "for local development, or set the environment variable for deployment."
    )


def _parse_allowed_origins(value: str | None) -> list[str]:
    """Return a de-duplicated list of explicit CORS origins."""
    origins = [
        origin.strip().rstrip("/")
        for origin in (value or "").split(",")
        if origin.strip()
    ]

    if not origins:
        raise RuntimeError("ALLOWED_ORIGINS must include at least one frontend origin.")
    if "*" in origins:
        raise RuntimeError(
            "ALLOWED_ORIGINS cannot contain '*' while credentialed requests are enabled."
        )

    return list(dict.fromkeys(origins))


DATABASE_URL = _required_environment_value("DATABASE_URL")
JWT_SECRET_KEY = _required_environment_value("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
except ValueError as error:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be an integer.") from error

if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be greater than zero.")


DEFAULT_LOCAL_ORIGINS = ",".join(
    [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ]
)
ALLOWED_ORIGINS = _parse_allowed_origins(os.getenv("ALLOWED_ORIGINS", DEFAULT_LOCAL_ORIGINS))
