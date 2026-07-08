from custom_components.smart_yardian.ntfy import (
    DEFAULT_NTFY_BASE_URL,
    ensure_ntfy_settings,
    is_valid_ntfy_topic,
    ntfy_link,
)


def test_ensure_ntfy_settings_generates_stable_topic() -> None:
    settings: dict[str, object] = {}

    assert ensure_ntfy_settings(settings) is True

    topic = settings["ntfy_topic"]
    assert is_valid_ntfy_topic(topic)
    assert ntfy_link(settings) == f"{DEFAULT_NTFY_BASE_URL}/{topic}"

    assert ensure_ntfy_settings(settings) is False
    assert settings["ntfy_topic"] == topic


def test_ntfy_settings_keep_existing_valid_topic() -> None:
    settings = {
        "ntfy_base_url": "https://ntfy.example.test/",
        "ntfy_topic": "smart-yardian-existing",
    }

    assert ensure_ntfy_settings(settings) is True

    assert settings["ntfy_base_url"] == "https://ntfy.example.test"
    assert settings["ntfy_topic"] == "smart-yardian-existing"
    assert ntfy_link(settings) == "https://ntfy.example.test/smart-yardian-existing"


def test_ntfy_link_rejects_invalid_topic() -> None:
    assert ntfy_link({"ntfy_base_url": "https://ntfy.sh", "ntfy_topic": "../bad"}) == ""
