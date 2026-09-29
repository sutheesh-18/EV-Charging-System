"""
AI Smart Recommendation Engine.

Scores every reachable charging station on a weighted combination of
factors (NOT simply nearest-station) and returns a ranked list with
human-readable explanations of why each station was recommended.
"""
import math
from typing import List
from sqlalchemy.orm import Session

from app.models.station import ChargingStation, Charger
from app.models.enums import ChargerStatus
from app.ml.prediction_service import predict_waiting_time, predict_queue

# Weights for each scoring factor (sum roughly to 1.0, tunable)
WEIGHTS = {
    "waiting_time": 0.25,
    "distance": 0.15,
    "cost": 0.15,
    "queue": 0.15,
    "reliability": 0.10,
    "rating": 0.08,
    "charging_speed": 0.07,
    "green_energy": 0.05,
}


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _normalize(value, min_v, max_v, invert=False):
    if max_v - min_v < 1e-9:
        norm = 0.5
    else:
        norm = (value - min_v) / (max_v - min_v)
    norm = min(max(norm, 0.0), 1.0)
    return 1 - norm if invert else norm


def recommend_stations(
    db: Session,
    stations: List[ChargingStation],
    current_lat: float,
    current_lon: float,
    remaining_battery_percent: float,
    vehicle_range_km: float,
    charger_type,
    max_results: int = 5,
):
    candidates = []
    max_reachable_km = vehicle_range_km * (remaining_battery_percent / 100.0) * 0.9  # 90% safety margin

    for station in stations:
        distance = haversine_km(current_lat, current_lon, station.latitude, station.longitude)
        reachable = distance <= max_reachable_km

        compatible_chargers = [c for c in station.chargers if c.charger_type == charger_type]
        if not compatible_chargers:
            continue

        available = sum(1 for c in compatible_chargers if c.status == ChargerStatus.AVAILABLE)
        occupied = len(compatible_chargers) - available
        best_power = max((c.power_kw for c in compatible_chargers), default=0)

        queue_pred = predict_queue(
            current_queue=max(occupied - available, 0),
            active_chargers=len(compatible_chargers),
            booking_count=occupied,
        )
        wait_minutes = predict_waiting_time(
            queue_length=max(occupied - available, 0),
            active_chargers=len(compatible_chargers),
            avg_charging_duration_min=35.0,
        )

        candidates.append({
            "station": station,
            "distance": distance,
            "reachable": reachable,
            "wait_minutes": wait_minutes,
            "queue_1hr": queue_pred["queue_1hr"],
            "available_chargers": available,
            "best_power": best_power,
        })

    if not candidates:
        return []

    distances = [c["distance"] for c in candidates]
    waits = [c["wait_minutes"] for c in candidates]
    queues = [c["queue_1hr"] for c in candidates]
    costs = [c["station"].charging_cost_per_kwh for c in candidates]
    powers = [c["best_power"] for c in candidates]

    scored = []
    for c in candidates:
        station = c["station"]
        score = (
            WEIGHTS["distance"] * _normalize(c["distance"], min(distances), max(distances), invert=True)
            + WEIGHTS["waiting_time"] * _normalize(c["wait_minutes"], min(waits), max(waits), invert=True)
            + WEIGHTS["queue"] * _normalize(c["queue_1hr"], min(queues), max(queues), invert=True)
            + WEIGHTS["cost"] * _normalize(station.charging_cost_per_kwh, min(costs), max(costs), invert=True)
            + WEIGHTS["reliability"] * (station.reliability_score / 100.0)
            + WEIGHTS["rating"] * (station.average_rating / 5.0)
            + WEIGHTS["charging_speed"] * _normalize(c["best_power"], min(powers), max(powers))
            + WEIGHTS["green_energy"] * (station.green_energy_percent / 100.0)
        )
        if not c["reachable"]:
            score *= 0.3  # heavily penalize unreachable stations rather than excluding, in case estimates are close

        reasons = []
        if c["wait_minutes"] == min(waits):
            reasons.append("Lowest predicted waiting time")
        if station.charging_cost_per_kwh == min(costs):
            reasons.append("Lowest charging cost")
        if c["best_power"] == max(powers):
            reasons.append("Fastest charger available")
        if c["queue_1hr"] == min(queues):
            reasons.append("Lowest predicted congestion")
        if c["reachable"]:
            reasons.append("Reachable with current battery")
        else:
            reasons.append("May require a charging stop en route (outside current safe range)")
        if station.reliability_score >= 90:
            reasons.append("High station reliability")
        if c["available_chargers"] > 0:
            reasons.append(f"{c['available_chargers']} charger(s) available now")

        scored.append({
            "station": station,
            "score": round(score * 100, 1),
            "distance": round(c["distance"], 2),
            "wait_minutes": round(c["wait_minutes"], 1),
            "reachable": c["reachable"],
            "reasons": reasons,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:max_results]
