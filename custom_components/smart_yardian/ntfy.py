"""Stable ntfy subscription link helpers."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

DEFAULT_NTFY_BASE_URL = "https://ntfy.sh"

_TOPIC_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,128}$")


def generate_ntfy_topic() -> str:
    """Return a private-ish topic name that can be stored permanently."""
    return f"smart-yardian-{uuid4().hex[:16]}"


def is_valid_ntfy_topic(value: Any) -> bool:
    """Return whether a value is safe to place into an ntfy URL path."""
    return isinstance(value, str) and bool(_TOPIC_PATTERN.fullmatch(value.strip()))


def normalize_ntfy_base_url(value: Any) -> str:
    """Normalize the ntfy server URL used for display."""
    return _validated_ntfy_base_url(value) or DEFAULT_NTFY_BASE_URL


def _validated_ntfy_base_url(value: Any) -> str | None:
    """Return a safe ntfy publish root, without credentials or URL parameters."""
    raw = str(value or DEFAULT_NTFY_BASE_URL).strip()
    if any(ord(character) < 32 for character in raw):
        return None
    try:
        parsed = urlsplit(raw)
        # Accessing port validates malformed values such as ":abc".
        _ = parsed.port
    except ValueError:
        return None
    if (
        parsed.scheme not in {"https", "http"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        return None
    path = parsed.path.rstrip("/")
    if any(part == ".." for part in path.split("/")):
        return None
    return urlunsplit((parsed.scheme, parsed.netloc, path, "", ""))


def ensure_ntfy_settings(settings: dict[str, Any]) -> bool:
    """Populate missing generated ntfy settings without rotating existing ones."""
    changed = False

    base_url = normalize_ntfy_base_url(settings.get("ntfy_base_url"))
    if settings.get("ntfy_base_url") != base_url:
        settings["ntfy_base_url"] = base_url
        changed = True

    if not is_valid_ntfy_topic(settings.get("ntfy_topic")):
        settings["ntfy_topic"] = generate_ntfy_topic()
        changed = True

    return changed


def ntfy_link(settings: dict[str, Any]) -> str:
    """Build the frontend-safe subscription link."""
    topic = str(settings.get("ntfy_topic") or "").strip()
    if not is_valid_ntfy_topic(topic):
        return ""
    return f"{normalize_ntfy_base_url(settings.get('ntfy_base_url'))}/{topic}"


def ntfy_publish_request(
    settings: dict[str, Any],
    title: str,
    message: str,
) -> tuple[str, dict[str, Any]]:
    """Build one validated JSON publish request for the ntfy root endpoint."""
    topic = str(settings.get("ntfy_topic") or "").strip()
    if not is_valid_ntfy_topic(topic):
        raise ValueError("Az ntfy topic hiányzik vagy érvénytelen.")
    base_url = _validated_ntfy_base_url(settings.get("ntfy_base_url"))
    if base_url is None:
        raise ValueError("Az ntfy kiszolgáló címe érvénytelen.")
    clean_title = str(title or "Smart Yardian").strip()[:256] or "Smart Yardian"
    clean_message = (
        str(message or "Smart Yardian értesítés").strip()[:4000]
        or "Smart Yardian értesítés"
    )
    return (
        base_url,
        {
            "topic": topic,
            "title": clean_title,
            "message": clean_message,
            "tags": ["droplet"],
        },
    )
