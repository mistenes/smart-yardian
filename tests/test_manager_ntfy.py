"""Direct ntfy delivery regressions without importing Home Assistant."""

from __future__ import annotations

import ast
import asyncio
import copy
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.smart_yardian.ntfy import ntfy_publish_request

MANAGER_PATH = (
    Path(__file__).parents[1] / "custom_components" / "smart_yardian" / "manager.py"
)
WEBSOCKET_PATH = (
    Path(__file__).parents[1] / "custom_components" / "smart_yardian" / "websocket.py"
)


def _standalone_manager_method(name: str, namespace: dict[str, Any]) -> Any:
    module = ast.parse(MANAGER_PATH.read_text(encoding="utf-8"))
    node = next(
        item
        for item in ast.walk(module)
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and item.name == name
    )
    node = copy.deepcopy(node)
    node.decorator_list = []
    source = f"from __future__ import annotations\n{ast.unparse(node)}"
    scope = {"__name__": "manager_ntfy_test", **namespace}
    exec(compile(source, str(MANAGER_PATH), "exec"), scope)
    return scope[name]


class FakeResponse:
    def __init__(self, status: int) -> None:
        self.status = status
        self.read_called = False

    async def __aenter__(self) -> FakeResponse:
        return self

    async def __aexit__(self, *_args: Any) -> None:
        return None

    async def read(self) -> bytes:
        self.read_called = True
        return b"{}"


class FakeSession:
    def __init__(self, status: int = 200) -> None:
        self.status = status
        self.calls: list[dict[str, Any]] = []
        self.response: FakeResponse | None = None

    def post(self, url: str, **kwargs: Any) -> FakeResponse:
        self.calls.append({"url": url, **kwargs})
        self.response = FakeResponse(self.status)
        return self.response


class FakeStore:
    def __init__(self, *, enabled: bool = True) -> None:
        self.settings = {
            "notify_mobile": enabled,
            "ntfy_base_url": "https://ntfy.sh",
            "ntfy_topic": "smart-yardian-testtopic",
        }
        self.runtime: dict[str, Any] = {}
        self.save_count = 0

    async def async_save(self) -> None:
        self.save_count += 1


def _publisher_manager(
    session: FakeSession,
) -> tuple[Any, datetime]:
    attempted_at = datetime(2026, 7, 24, 6, 0, tzinfo=UTC)
    accepted_at = attempted_at + timedelta(seconds=1)
    timestamps = iter((attempted_at, accepted_at))
    record_status = _standalone_manager_method(
        "_async_record_ntfy_status",
        {"_LOGGER": SimpleNamespace(warning=lambda *_args: None)},
    )
    publish = _standalone_manager_method(
        "_async_publish_ntfy",
        {
            "ntfy_publish_request": ntfy_publish_request,
            "async_get_clientsession": lambda _hass: session,
            "NTFY_REQUEST_TIMEOUT_SECONDS": 15,
            "dt_util": SimpleNamespace(utcnow=lambda: next(timestamps)),
        },
    )

    class Manager:
        _async_record_ntfy_status = record_status
        _async_publish_ntfy = publish

        def __init__(self) -> None:
            self.hass = object()
            self.store = FakeStore()
            self.listener_calls = 0

        def _notify_listeners(self) -> None:
            self.listener_calls += 1

    return Manager(), accepted_at


def test_direct_ntfy_publish_uses_root_json_even_without_ha_notify_service() -> None:
    session = FakeSession()
    manager, accepted_at = _publisher_manager(session)

    asyncio.run(manager._async_publish_ntfy("A program kimaradt.", "Öntözés"))

    assert session.calls == [
        {
            "url": "https://ntfy.sh",
            "json": {
                "topic": "smart-yardian-testtopic",
                "title": "Öntözés",
                "message": "A program kimaradt.",
                "tags": ["droplet"],
            },
            "timeout": 15,
        }
    ]
    assert session.response is not None and session.response.read_called
    assert manager.store.runtime["ntfy_status"] == {
        "last_attempt_at": "2026-07-24T06:00:00+00:00",
        "last_accepted_at": accepted_at.isoformat(),
        "last_error": None,
    }
    assert manager.store.save_count == 1
    assert manager.listener_calls == 1


def test_direct_ntfy_http_failure_is_recorded_and_reported() -> None:
    session = FakeSession(status=403)
    attempted_at = datetime(2026, 7, 24, 6, 0, tzinfo=UTC)
    record_status = _standalone_manager_method(
        "_async_record_ntfy_status",
        {"_LOGGER": SimpleNamespace(warning=lambda *_args: None)},
    )
    publish = _standalone_manager_method(
        "_async_publish_ntfy",
        {
            "ntfy_publish_request": ntfy_publish_request,
            "async_get_clientsession": lambda _hass: session,
            "NTFY_REQUEST_TIMEOUT_SECONDS": 15,
            "dt_util": SimpleNamespace(utcnow=lambda: attempted_at),
        },
    )

    class Manager:
        _async_record_ntfy_status = record_status
        _async_publish_ntfy = publish

        def __init__(self) -> None:
            self.hass = object()
            self.store = FakeStore()

        def _notify_listeners(self) -> None:
            return None

    manager = Manager()

    with pytest.raises(ValueError, match="HTTP 403"):
        asyncio.run(manager._async_publish_ntfy("Hiba", "Öntözés"))

    assert manager.store.runtime["ntfy_status"]["last_error"].startswith(
        "Az ntfy kiszolgáló HTTP 403"
    )
    assert "last_accepted_at" not in manager.store.runtime["ntfy_status"]


def test_async_notify_calls_direct_ntfy_without_configured_ha_service() -> None:
    persistent_calls: list[dict[str, Any]] = []
    publish_calls: list[tuple[str, str]] = []
    async_notify = _standalone_manager_method(
        "async_notify",
        {
            "persistent_notification": SimpleNamespace(
                async_create=lambda _hass, message, **kwargs: persistent_calls.append(
                    {"message": message, **kwargs}
                )
            ),
            "DOMAIN": "smart_yardian",
            "CONF_NOTIFY_SERVICE": "notify_service",
            "_LOGGER": SimpleNamespace(warning=lambda *_args: None),
        },
    )

    class Manager:
        def __init__(self, enabled: bool) -> None:
            self.hass = SimpleNamespace(services=SimpleNamespace())
            self.entry_id = "entry"
            self.config: dict[str, Any] = {}
            self.store = FakeStore(enabled=enabled)

        async def _async_publish_ntfy(self, message: str, title: str) -> None:
            publish_calls.append((message, title))

    Manager.async_notify = async_notify
    enabled = Manager(True)
    asyncio.run(enabled.async_notify("Üzenet", "Cím"))
    assert publish_calls == [("Üzenet", "Cím")]
    assert persistent_calls[-1]["notification_id"] == "smart_yardian_entry"

    disabled = Manager(False)
    asyncio.run(disabled.async_notify("Másik", "Cím"))
    assert publish_calls == [("Üzenet", "Cím")]
    assert len(persistent_calls) == 2


def test_notification_test_websocket_is_registered_and_reports_failures() -> None:
    source = WEBSOCKET_PATH.read_text(encoding="utf-8")

    assert 'f"{WS_PREFIX}/notifications/test"' in source
    assert "await _manager(hass).async_test_ntfy()" in source
    assert '"ntfy_failed"' in source
    assert "websocket_notification_test," in source


def test_optional_ha_notify_service_does_not_block_irrigation() -> None:
    source = ast.unparse(
        next(
            item
            for item in ast.walk(ast.parse(MANAGER_PATH.read_text(encoding="utf-8")))
            if isinstance(item, ast.AsyncFunctionDef) and item.name == "async_notify"
        )
    )

    assert "await self._async_publish_ntfy(message, title)" in source
    assert "blocking=False" in source
