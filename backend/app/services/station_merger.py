"""
Merge VoltGrid database stations with Open Charge Map stations.

The goal is to present one unified station list while avoiding
duplicate physical locations.
"""

from typing import Any


def _normalize_text(value: Any) -> str:
    """Normalize text for simple comparison."""

    if value is None:
        return ""

    return " ".join(
        str(value).lower().strip().split()
    )


def _distance_between_points(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Approximate geographic distance in kilometers.

    Uses a local approximation suitable for duplicate detection.
    """

    from math import cos, radians, sqrt

    mean_latitude = radians(
        (lat1 + lat2) / 2
    )

    lat_distance = (
        lat2 - lat1
    ) * 111.0

    lon_distance = (
        lon2 - lon1
    ) * 111.0 * cos(mean_latitude)

    return sqrt(
        lat_distance ** 2
        + lon_distance ** 2
    )


def _is_same_physical_station(
    voltgrid_station: dict[str, Any],
    external_station: dict[str, Any],
) -> bool:
    """
    Determine whether two station records probably represent
    the same physical charging location.

    We primarily use geographic proximity and then use
    name/operator/address similarity as supporting evidence.
    """

    vg_lat = voltgrid_station.get("latitude")
    vg_lon = voltgrid_station.get("longitude")

    ext_lat = external_station.get("latitude")
    ext_lon = external_station.get("longitude")

    if (
        vg_lat is None
        or vg_lon is None
        or ext_lat is None
        or ext_lon is None
    ):
        return False

    try:
        distance = _distance_between_points(
            float(vg_lat),
            float(vg_lon),
            float(ext_lat),
            float(ext_lon),
        )
    except (TypeError, ValueError):
        return False

    # Very close coordinates strongly suggest the same
    # physical station.
    if distance <= 0.10:
        return True

    # For slightly larger coordinate differences, compare
    # identifying text.
    vg_name = _normalize_text(
        voltgrid_station.get("name")
    )

    ext_name = _normalize_text(
        external_station.get("name")
    )

    vg_operator = _normalize_text(
        voltgrid_station.get("operator")
    )

    ext_operator = _normalize_text(
        external_station.get("operator")
    )

    vg_address = _normalize_text(
        voltgrid_station.get("address")
    )

    ext_address = _normalize_text(
        external_station.get("address")
    )

    name_match = (
        bool(vg_name)
        and bool(ext_name)
        and (
            vg_name in ext_name
            or ext_name in vg_name
        )
    )

    operator_match = (
        bool(vg_operator)
        and bool(ext_operator)
        and (
            vg_operator in ext_operator
            or ext_operator in vg_operator
        )
    )

    address_match = (
        bool(vg_address)
        and bool(ext_address)
        and (
            vg_address in ext_address
            or ext_address in vg_address
        )
    )

    # Within 500 meters, strong identifying information can
    # indicate the same physical station.
    if distance <= 0.50:
        if name_match and (
            operator_match
            or address_match
        ):
            return True

        if address_match:
            return True

    return False


def merge_station_sources(
    voltgrid_stations: list[dict[str, Any]],
    external_stations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Merge VoltGrid and Open Charge Map stations.

    VoltGrid stations are kept as the primary records.
    External stations are added only when they do not
    appear to duplicate an existing VoltGrid station.
    """

    merged: list[dict[str, Any]] = []

    # --------------------------------------------------------
    # Add VoltGrid stations first
    # --------------------------------------------------------

    for station in voltgrid_stations:
        merged.append(
            {
                **station,
                "source": "voltgrid",
            }
        )

    # --------------------------------------------------------
    # Add external stations if they are not duplicates
    # --------------------------------------------------------

    for external_station in external_stations:

        duplicate = False

        for voltgrid_station in voltgrid_stations:

            if _is_same_physical_station(
                voltgrid_station,
                external_station,
            ):
                duplicate = True
                break

        if duplicate:
            continue

        merged.append(
            external_station
        )

    # --------------------------------------------------------
    # Sort by distance
    # --------------------------------------------------------

    merged.sort(
        key=lambda station: (
            station.get("distance_km")
            if station.get("distance_km") is not None
            else float("inf")
        )
    )

    return merged