from custom_components.smart_yardian.ntfy import (
    DEFAULT_NTFY_BASE_URL,
    ensure_ntfy_settings,
    is_valid_ntfy_topic,
    normalize_ntfy_base_url,
    ntfy_link,
    ntfy_publish_request,
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


def test_ntfy_publish_request_targets_root_with_unicode_json() -> None:
    url, payload = ntfy_publish_request(
        {
            "ntfy_base_url": "https://ntfy.example.test/root/",
            "ntfy_topic": "smart-yardian-existing",
        },
        "Öntözési hiba",
        "A zóna nem indult el.",
    )

    assert url == "https://ntfy.example.test/root"
    assert payload == {
        "topic": "smart-yardian-existing",
        "title": "Öntözési hiba",
        "message": "A zóna nem indult el.",
        "tags": ["droplet"],
    }


def test_ntfy_publish_request_rejects_unsafe_server_url() -> None:
    settings = {
        "ntfy_base_url": "https://user:secret@ntfy.example.test?topic=wrong",
        "ntfy_topic": "smart-yardian-existing",
    }

    assert normalize_ntfy_base_url(settings["ntfy_base_url"]) == DEFAULT_NTFY_BASE_URL
    try:
        ntfy_publish_request(settings, "Teszt", "Üzenet")
    except ValueError as err:
        assert "kiszolgáló" in str(err)
    else:
        raise AssertionError("Unsafe ntfy URL was accepted")
