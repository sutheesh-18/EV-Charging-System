"""
Open Charge Map API integration for VoltGrid.
"""

from typing import Any

import httpx

from app.core.config import settings


OCM_POI_URL = "https://api.openchargemap.io/v3/poi/"


async def get_nearby_stations(
    latitude: float,
    longitude: float,
    distance_km: float = 10,
    max_results: int = 50,
) -> list[dict[str, Any]]:
    """
    Fetch nearby charging stations from Open Charge Map.
    """

    if not settings.OPENCHARGE_MAP_API_KEY:
        raise RuntimeError("Open Charge Map API key is not configured.")

    params = {
        "key": settings.OPENCHARGE_MAP_API_KEY,
        "latitude": latitude,
        "longitude": longitude,
        "distance": distance_km,
        "distanceunit": "KM",
        "maxresults": max_results,
        "compact": "false",
        "verbose": "false",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(OCM_POI_URL, params=params)
        response.raise_for_status()

        data = response.json()

    if not isinstance(data, list):
        raise RuntimeError("Unexpected response from Open Charge Map.")

    return data