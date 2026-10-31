
"""
Merge VoltGrid database stations with Open Charge Map stations.

VoltGrid stations remain the primary records.
External information is added to matching VoltGrid stations
without overwriting VoltGrid's live data or booking identity.
"""

from math import cos, radians, sqrt
from typing import Any


def _normalize_text(value: Any) -> str:
    """Normalize text for comparison."""
    if value is None:
        return ""

    return " ".join(str(value).lower().strip().split())


def _distance_between_points(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Calculate approximate geographic distance in kilometers."""

    mean_latitude = radians((lat1 + lat2) / 2)

    lat_distance = (lat2 - lat1) * 111.0
    lon_distance = (
        (lon2 - lon1) * 111.0 * cos(mean_latitude)
    )

    return sqrt(lat_distance ** 2 + lon_distance ** 2)


def _text_matches(value1: Any, value2: Any) -> bool:
    """Check whether two non-empty text values are similar."""

    text1 = _normalize_text(value1)
    text2 = _normalize_text(value2)

    if not text1 or not text2:
        return False

    return text1 == text2 or text1 in text2 or text2 in text1


def _is_same_physical_station(
    voltgrid_station: dict[str, Any],
    external_station: dict[str, Any],
) -> bool:
    """Identify probable duplicate physical station records."""

    try:
        vg_lat = float(voltgrid_station["latitude"])
        vg_lon = float(voltgrid_station["longitude"])
        ext_lat = float(external_station["latitude"])
        ext_lon = float(external_station["longitude"])
    except (KeyError, TypeError, ValueError):
        return False

    distance = _distance_between_points(
        vg_lat, vg_lon, ext_lat, ext_lon
    )

    # Do not merge stations that are more than 500 metres apart.
    if distance > 0.50:
        return False

    name_match = _text_matches(
        voltgrid_station.get("name"),
        external_station.get("name"),
    )

    operator_match = _text_matches(
        voltgrid_station.get("operator"),
        external_station.get("operator"),
    )

    address_match = _text_matches(
        voltgrid_station.get("address"),
        external_station.get("address"),
    )

    # Strong identifying evidence.
    if name_match and (operator_match or address_match):
        return True

    # Very close coordinates still need some matching identity evidence.
    if distance <= 0.05 and (
        name_match or operator_match or address_match
    ):
        return True

    return False


def _has_value(value: Any) -> bool:
    """Return False for missing values without treating False or 0 as missing."""

    return value is not None and value != "" and value != []


def _merge_external_metadata(
    voltgrid_station: dict[str, Any],
    external_station: dict[str, Any],
) -> dict[str, Any]:
    """
    Supplement a VoltGrid record with missing external information.

    Never overwrite VoltGrid live availability, station ID,
    coordinates, or internal booking identity.
    """

    external_fields = [
    "external_id",
    "operator",
    "charging_cost_per_kwh",
    "price_per_kwh",
    "connectors",
    "booking_url",
    "operator_website_url",
    "station_info_url",
    "openchargemap_url",
    "usage_type",
    "is_pay_at_location",
    "is_membership_required",
]

    for field in external_fields:
        current_value = voltgrid_station.get(field)
        external_value = external_station.get(field)

        if (
            not _has_value(current_value)
            and _has_value(external_value)
        ):
            voltgrid_station[field] = external_value

    # Keep VoltGrid as the primary record.
    voltgrid_station["source"] = "voltgrid"

    return voltgrid_station


def merge_station_sources(
    voltgrid_stations: list[dict[str, Any]],
    external_stations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Merge VoltGrid and Open Charge Map station records.

    Matching stations:
        Keep VoltGrid and supplement missing external metadata.

    Non-matching external stations:
        Add them as independent external stations.
    """

    merged: list[dict[str, Any]] = []

    # Create independent copies of VoltGrid records.
    voltgrid_records = [
        {
            **station,
            "source": "voltgrid",
        }
        for station in voltgrid_stations
    ]

    merged.extend(voltgrid_records)

    # Process external stations.
    for external_station in external_stations:

        matching_station = None

        for voltgrid_station in voltgrid_records:
            if _is_same_physical_station(
                voltgrid_station,
                external_station,
            ):
                matching_station = voltgrid_station
                break

        if matching_station is not None:
            # Preserve VoltGrid while supplementing external information.
            _merge_external_metadata(
                matching_station,
                external_station,
            )
        else:
            # Add independent OCM station.
            merged.append({
                **external_station,
                "source": "openchargemap",
            })

    # Sort all stations by distance.
    merged.sort(
        key=lambda station: (
            float(station["distance_km"])
            if station.get("distance_km") is not None
            else float("inf")
        )
    )

    return merged
