"""
Normalize Open Charge Map station data into a clean VoltGrid format.
"""

from math import asin, cos, radians, sin, sqrt
from typing import Any


def haversine_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate the distance between two geographic coordinates
    using the Haversine formula.
    """

    earth_radius_km = 6371.0

    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)

    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1_rad)
        * cos(lat2_rad)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * asin(sqrt(a))

    return earth_radius_km * c


def normalize_ocm_station(
    station: dict[str, Any],
    search_latitude: float | None = None,
    search_longitude: float | None = None,
) -> dict[str, Any]:
    """
    Convert one Open Charge Map station into the
    clean VoltGrid format.
    """

    address_info = station.get("AddressInfo") or {}
    operator_info = station.get("OperatorInfo") or {}
    status_info = station.get("StatusType") or {}
    usage_info = station.get("UsageType") or {}

    # --------------------------------------------------------
    # Basic station information
    # --------------------------------------------------------

    station_id = station.get("ID")

    name = (
        address_info.get("Title")
        or "Unnamed Charging Station"
    )

    address_parts = [
        address_info.get("AddressLine1"),
        address_info.get("AddressLine2"),
        address_info.get("Town"),
        address_info.get("StateOrProvince"),
        address_info.get("Postcode"),
    ]

    address = ", ".join(
        str(part).strip()
        for part in address_parts
        if part
    )

    # --------------------------------------------------------
    # Operator
    # --------------------------------------------------------

    operator = operator_info.get("Title")

    # --------------------------------------------------------
    # Location
    # --------------------------------------------------------

    latitude = address_info.get("Latitude")
    longitude = address_info.get("Longitude")

    # --------------------------------------------------------
    # Calculate distance ourselves
    # --------------------------------------------------------

    distance_km = None

    if (
        latitude is not None
        and longitude is not None
        and search_latitude is not None
        and search_longitude is not None
    ):
        try:
            distance_km = round(
                haversine_km(
                    search_latitude,
                    search_longitude,
                    float(latitude),
                    float(longitude),
                ),
                2,
            )
        except (TypeError, ValueError):
            distance_km = None

    # --------------------------------------------------------
    # Operational status
    # --------------------------------------------------------

    is_operational = status_info.get(
        "IsOperational"
    )

    status = (
        status_info.get("Title")
        or "Unknown"
    )

    # --------------------------------------------------------
    # Usage / payment information
    # --------------------------------------------------------

    usage_type = usage_info.get("Title")

    is_pay_at_location = usage_info.get(
        "IsPayAtLocation"
    )

    is_membership_required = usage_info.get(
        "IsMembershipRequired"
    )

    # --------------------------------------------------------
    # Connector information
    # --------------------------------------------------------

    normalized_connectors = []

    connections = station.get("Connections") or []

    for connection in connections:

        connection_type = (
            connection.get("ConnectionType")
            or {}
        )

        level = (
            connection.get("Level")
            or {}
        )

        connector_status = (
            connection.get("StatusType")
            or {}
        )

        power_kw = connection.get("PowerKW")

        if power_kw is not None:
            try:
                power_kw = float(power_kw)
            except (TypeError, ValueError):
                power_kw = None

        normalized_connectors.append(
            {
                "type": (
                    connection_type.get("Title")
                    or "Unknown"
                ),
                "power_kw": power_kw,
                "amps": connection.get("Amps"),
                "voltage": connection.get("Voltage"),
                "level": level.get("Title"),
                "quantity": connection.get("Quantity"),
                "status": connector_status.get("Title"),
            }
        )

    # --------------------------------------------------------
    # Return clean VoltGrid object
    # --------------------------------------------------------

    return {
        "source": "openchargemap",
        "external_id": station_id,
        "name": name,
        "operator": operator,
        "address": address,
        "city": address_info.get("Town"),
        "state": address_info.get("StateOrProvince"),
        "postcode": address_info.get("Postcode"),
        "country": (
            (address_info.get("Country") or {}).get("Title")
        ),
        "latitude": latitude,
        "longitude": longitude,
        "distance_km": distance_km,
        "status": status,
        "is_operational": is_operational,
        "usage_type": usage_type,
        "is_pay_at_location": is_pay_at_location,
        "is_membership_required": is_membership_required,
        "connectors": normalized_connectors,
    }


def normalize_ocm_stations(
    stations: list[dict[str, Any]],
    search_latitude: float | None = None,
    search_longitude: float | None = None,
) -> list[dict[str, Any]]:
    """
    Normalize multiple Open Charge Map stations.
    """

    normalized = []

    for station in stations:
        try:
            normalized_station = normalize_ocm_station(
                station,
                search_latitude=search_latitude,
                search_longitude=search_longitude,
            )

            normalized.append(
                normalized_station
            )

        except Exception:
            # Ignore malformed individual records
            # instead of breaking the complete response.
            continue

    # Sort nearest stations first
    normalized.sort(
        key=lambda station: (
            station["distance_km"]
            if station["distance_km"] is not None
            else float("inf")
        )
    )

    return normalized