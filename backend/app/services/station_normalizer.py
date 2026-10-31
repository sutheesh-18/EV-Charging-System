
"""
Normalize Open Charge Map station data into a clean VoltGrid format.
"""

import re
from math import asin, cos, isfinite, radians, sin, sqrt
from typing import Any
from urllib.parse import urlparse


def validate_http_url(value: Any) -> str | None:
    """
    Return a valid HTTP/HTTPS URL or None.

    URL validation does not guarantee that the URL exists
    or provides a booking facility.
    """
    if not isinstance(value, str) or not value.strip():
        return None

    url = value.strip()

    try:
        parsed = urlparse(url)

        if (
            parsed.scheme.lower() not in {"http", "https"}
            or not parsed.hostname
            or not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
        ):
            return None

        # Validate the port format, if provided.
        _ = parsed.port

        return url

    except (ValueError, AttributeError):
        return None


def to_float(value: Any) -> float | None:
    """Safely convert a value to a finite float."""
    if value is None or isinstance(value, bool):
        return None

    try:
        result = float(value)
        return result if isfinite(result) else None
    except (TypeError, ValueError):
        return None


def to_int(value: Any) -> int | None:
    """Safely convert a value to an integer."""
    if value is None or isinstance(value, bool):
        return None

    try:
        return int(value)
    except (TypeError, ValueError, OverflowError):
        return None


def parse_usage_cost(value: Any) -> float | None:
    """
    Extract a numeric price per kWh from Open Charge Map UsageCost.

    Examples:
        '21/kWh'       -> 21.0
        '14.99/kWh'    -> 14.99
        '₹21/kWh'      -> 21.0
        '21 per kWh'   -> 21.0

    Unknown or ambiguous formats return None.
    """
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return to_float(value)

    if not isinstance(value, str) or not value.strip():
        return None

    text = value.strip().replace(",", "")

    # Only accept a value explicitly expressed per kWh.
    if not re.search(
        r"(?:/|per\s*)\s*kwh\b",
        text,
        re.IGNORECASE,
    ):
        return None

    match = re.search(r"\d+(?:\.\d+)?", text)

    if not match:
        return None

    price = to_float(match.group(0))

    if price is None or price < 0:
        return None

    return round(price, 2)


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

    # Protect against floating-point rounding outside [0, 1].
    a = max(0.0, min(1.0, a))

    c = 2 * asin(sqrt(a))

    return earth_radius_km * c


def normalize_ocm_station(
    station: dict[str, Any],
    search_latitude: float | None = None,
    search_longitude: float | None = None,
) -> dict[str, Any]:
    """
    Convert one Open Charge Map station into the clean VoltGrid
    format, including price, connector and external URL information.
    """

    address_info = station.get("AddressInfo") or {}
    operator_info = station.get("OperatorInfo") or {}
    status_info = station.get("StatusType") or {}
    usage_info = station.get("UsageType") or {}

    # --------------------------------------------------------
    # BASIC STATION INFORMATION
    # --------------------------------------------------------

    station_id = to_int(station.get("ID"))

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
        if part and str(part).strip()
    )

    operator = operator_info.get("Title")

    # --------------------------------------------------------
    # EXTERNAL BOOKING AND WEBSITE URLS
    # --------------------------------------------------------

    # Only use actual URLs supplied by the provider.
    # Do not invent a booking URL.

    booking_url = validate_http_url(
        operator_info.get("BookingURL")
        or station.get("BookingURL")
    )

    operator_website_url = validate_http_url(
        operator_info.get("WebsiteURL")
    )

    station_info_url = validate_http_url(
        address_info.get("RelatedURL")
        or operator_info.get("RelatedURL")
    )

    # Informational page, not a guaranteed booking facility.

    openchargemap_url = None

    if station_id is not None:
        openchargemap_url = (
            "https://openchargemap.org/site/poi/details/"
            f"{station_id}"
        )

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    latitude = to_float(address_info.get("Latitude"))
    longitude = to_float(address_info.get("Longitude"))

    # Reject invalid geographic coordinates.

    if (
        latitude is not None
        and not -90 <= latitude <= 90
    ):
        latitude = None

    if (
        longitude is not None
        and not -180 <= longitude <= 180
    ):
        longitude = None

    # --------------------------------------------------------
    # DISTANCE
    # --------------------------------------------------------

    distance_km = None

    search_lat = to_float(search_latitude)
    search_lon = to_float(search_longitude)

    if (
        latitude is not None
        and longitude is not None
        and search_lat is not None
        and search_lon is not None
    ):
        distance_km = round(
            haversine_km(
                search_lat,
                search_lon,
                latitude,
                longitude,
            ),
            2,
        )

    # --------------------------------------------------------
    # OPERATIONAL STATUS
    # --------------------------------------------------------

    is_operational = status_info.get("IsOperational")

    status = (
        status_info.get("Title")
        or "Unknown"
    )

    # --------------------------------------------------------
    # USAGE AND PAYMENT INFORMATION
    # --------------------------------------------------------

    usage_type = usage_info.get("Title")

    is_pay_at_location = usage_info.get(
        "IsPayAtLocation"
    )

    is_membership_required = usage_info.get(
        "IsMembershipRequired"
    )

    # --------------------------------------------------------
    # PRICE INFORMATION
    # --------------------------------------------------------

    # Open Charge Map provides this as a string in some records.
    # Example: "21/kWh" or "14.99/kWh".

    charging_cost_per_kwh = parse_usage_cost(
        station.get("UsageCost")
    )

    # --------------------------------------------------------
    # CONNECTOR INFORMATION
    # --------------------------------------------------------

    normalized_connectors: list[dict[str, Any]] = []

    connections = station.get("Connections") or []

    if isinstance(connections, list):
        for connection in connections:
            if not isinstance(connection, dict):
                continue

            connection_type = (
                connection.get("ConnectionType") or {}
            )

            level = (
                connection.get("Level") or {}
            )

            connector_status = (
                connection.get("StatusType") or {}
            )

            if not isinstance(connection_type, dict):
                connection_type = {}

            if not isinstance(level, dict):
                level = {}

            if not isinstance(connector_status, dict):
                connector_status = {}

            power_kw = to_float(
                connection.get("PowerKW")
            )

            quantity = to_int(
                connection.get("Quantity")
            )

            amps = to_float(
                connection.get("Amps")
            )

            voltage = to_float(
                connection.get("Voltage")
            )

            normalized_connectors.append(
                {
                    "type": (
                        connection_type.get("Title")
                        or "Connector type not provided"
                    ),
                    "power_kw": power_kw,
                    "amps": amps,
                    "voltage": voltage,
                    "level": level.get("Title"),
                    "quantity": quantity,
                    "status": (
                        connector_status.get("Title")
                        or "Status not provided"
                    ),
                }
            )

    # --------------------------------------------------------
    # RETURN NORMALIZED VOLTGRID OBJECT
    # --------------------------------------------------------

    return {
        "source": "openchargemap",
        "id": None,
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

        # Price is populated only when the source supplies a
        # recognizable per-kWh value.
        "charging_cost_per_kwh": charging_cost_per_kwh,
        "price_per_kwh": charging_cost_per_kwh,

        # Open Charge Map connector data is not live availability.
        # Never calculate free chargers from connector status.
        "available_chargers": None,
        "total_chargers": None,

        "connectors": normalized_connectors,

        # External links
        "booking_url": booking_url,
        "operator_website_url": operator_website_url,
        "station_info_url": station_info_url,
        "openchargemap_url": openchargemap_url,
    }


def normalize_ocm_stations(
    stations: list[dict[str, Any]],
    search_latitude: float | None = None,
    search_longitude: float | None = None,
) -> list[dict[str, Any]]:
    """
    Normalize multiple Open Charge Map stations.
    """

    normalized: list[dict[str, Any]] = []

    for station in stations:
        if not isinstance(station, dict):
            continue

        try:
            normalized_station = normalize_ocm_station(
                station,
                search_latitude=search_latitude,
                search_longitude=search_longitude,
            )

            # A station without valid coordinates cannot be placed
            # on the MapPage map, so do not return it as mappable.
            if (
                normalized_station["latitude"] is None
                or normalized_station["longitude"] is None
            ):
                continue

            normalized.append(normalized_station)

        except (AttributeError, TypeError, ValueError, OverflowError):
            # One malformed provider record must not interrupt
            # the processing of the remaining stations.
            continue

    # Sort nearest stations first.
    normalized.sort(
        key=lambda item: (
            item["distance_km"]
            if item["distance_km"] is not None
            else float("inf")
        )
    )

    return normalized
