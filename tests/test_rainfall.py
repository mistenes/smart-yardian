"""Tests for Időkép measured-rain station parsing and lookup."""

from __future__ import annotations

from custom_components.smart_yardian.rainfall import (
    find_rain_stations,
    parse_idokep_rain_map,
)

SAMPLE = """
<map name="csap24a">
<area shape='rect' coords='439,209,449,219' href='/automata/csomor1'
 onmouseover='this.T_WIDTH=349;Tip("2.40 mm (radar 1.90 mm) Csömör (csomor1)<br><img src=x>")'>
<area shape='rect' coords='414,199,424,209' href='/automata/tom'
 onmouseover='this.T_WIDTH=349;Tip("0.00 mm (radar 0.02 mm) Budapest&nbsp;III.ker&nbsp;-&nbsp;Csillaghegy (tom)<br><img src=x>")'>
</map>
<map name="daily">
<area shape='rect' coords='1,2,3,4' href='/automata/wrong'
 onmouseover='Tip("<b>99 mm</b><br><b>Máshol</b>")'>
</map>
"""


def test_parse_idokep_24_hour_station_observations() -> None:
    observations = parse_idokep_rain_map(SAMPLE)

    assert len(observations) == 2
    assert observations[0].station_id == "csomor1"
    assert observations[0].location == "Csömör"
    assert observations[0].measured_mm == 2.4
    assert observations[0].radar_mm == 1.9
    assert observations[0].map_x == 444


def test_station_search_is_accent_insensitive_and_prefers_exact_city() -> None:
    observations = parse_idokep_rain_map(SAMPLE)

    result = find_rain_stations(observations, "csomor")

    assert [item.station_id for item in result] == ["csomor1"]


def test_station_search_matches_city_district_text() -> None:
    observations = parse_idokep_rain_map(SAMPLE)

    result = find_rain_stations(observations, "Csillaghegy")

    assert [item.station_id for item in result] == ["tom"]
