"""Stable ntfy subscription link helpers."""

from __future__ import annotations

import re
from typing import Any
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
    url = str(value or "").strip().rstrip("/")
    if not url.startswith(("https://", "http://")):
        return DEFAULT_NTFY_BASE_URL
    return url


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
