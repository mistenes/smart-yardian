"""Transport and cache tests for the OpenWeather 4.0 client."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from custom_components.smart_yardian.weather import (
    OpenWeatherAuthenticationError,
    OpenWeatherClient,
    OpenWeatherRateLimitError,
    reserve_daily_request,
)


class FakeResponse:
    def __init__(self, status: int, payload: dict[str, Any]) -> None:
        self.status = status
        self.payload = payload

    async def __aenter__(self) -> FakeResponse:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def json(self, content_type: None = None) -> dict[str, Any]:
        del content_type
        return self.payload


class FakeSession:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response
        self.calls = 0

    def get(self, *args: object, **kwargs: object) -> FakeResponse:
        del args, kwargs
        self.calls += 1
        return self.response


def payload() -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "data": [
            {
                "dt": int((now + timedelta(hours=index + 1)).timestamp()),
                "temp": 27,
                "pop": 0.1,
                "clouds": 20,
                "weather": [{"main": "Clear", "icon": "01d"}],
            }
            for index in range(24)
        ]
    }


def test_openweather_cache_avoids_duplicate_request() -> None:
    session = FakeSession(FakeResponse(200, payload()))
    client = OpenWeatherClient(session, "secret", 47.5, 19.0)

    first = asyncio.run(client.async_fetch())
    second = asyncio.run(client.async_fetch())

    assert session.calls == 1
    assert first is second
    assert len(first) == 24


def test_openweather_quota_guard_runs_only_for_real_http_requests() -> None:
    session = FakeSession(FakeResponse(200, payload()))
    reservations = 0

    async def reserve() -> None:
        nonlocal reservations
        reservations += 1

    client = OpenWeatherClient(
        session,
        "secret",
        47.5,
        19.0,
        before_request=reserve,
    )

    asyncio.run(client.async_fetch())
    asyncio.run(client.async_fetch())
    asyncio.run(client.async_fetch(force=True))

    assert reservations == 2
    assert session.calls == 2


def test_openweather_quota_guard_blocks_before_http() -> None:
    session = FakeSession(FakeResponse(200, payload()))

    async def reject() -> None:
        raise OpenWeatherRateLimitError("daily limit")

    client = OpenWeatherClient(
        session,
        "secret",
        47.5,
        19.0,
        before_request=reject,
    )

    with pytest.raises(OpenWeatherRateLimitError, match="daily limit"):
        asyncio.run(client.async_fetch())
    assert session.calls == 0


def test_daily_quota_never_reserves_more_than_200() -> None:
    state: dict[str, Any] = {}
    for _ in range(200):
        state = reserve_daily_request(state, "2026-06-29")

    assert state["count"] == 200
    with pytest.raises(OpenWeatherRateLimitError, match="napi 200"):
        reserve_daily_request(state, "2026-06-29")

    reset = reserve_daily_request(state, "2026-06-30")
    assert reset == {"date": "2026-06-30", "count": 1}


@pytest.mark.parametrize(
    ("status", "error"),
    [
        (401, OpenWeatherAuthenticationError),
        (429, OpenWeatherRateLimitError),
    ],
)
def test_openweather_specific_http_errors(
    status: int,
    error: type[Exception],
) -> None:
    session = FakeSession(FakeResponse(status, {}))
    client = OpenWeatherClient(session, "secret", 47.5, 19.0)

    with pytest.raises(error):
        asyncio.run(client.async_fetch())
