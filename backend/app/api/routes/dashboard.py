from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, Vehicle
from app.models.station import ChargingStation
from app.models.booking import Booking, ChargingSession
from app.models.enums import BookingStatus, SessionStatus
from app.services.recommendation_engine import recommend_stations


router = APIRouter(
    prefix="/dashboard",
    tags=["Driver Dashboard"],
)


CO2_SAVED_PER_KWH = 0.7


@router.get("/overview")
def dashboard_overview(
    lat: Optional[float] = Query(
        default=None,
        description="Current driver latitude",
    ),
    lon: Optional[float] = Query(
        default=None,
        description="Current driver longitude",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the authenticated driver's dashboard overview.

    The recommendation engine uses:
    - driver's default vehicle
    - remaining battery
    - vehicle range
    - charger type
    - current GPS location
    - live charging station data
    """

    # =========================================================
    # 1. GET DRIVER VEHICLE
    # =========================================================

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.owner_id == current_user.id,
            Vehicle.is_default.is_(True),
        )
        .first()
    )

    # If no default vehicle exists, use the first vehicle.
    if vehicle is None:
        vehicle = (
            db.query(Vehicle)
            .filter(Vehicle.owner_id == current_user.id)
            .order_by(Vehicle.created_at.asc())
            .first()
        )

    # =========================================================
    # 2. BASIC VEHICLE INFORMATION
    # =========================================================

    battery_percentage = (
        round(vehicle.remaining_battery_percent, 1)
        if vehicle
        else None
    )

    range_km = (
        round(vehicle.vehicle_range_km, 1)
        if vehicle
        else None
    )

    vehicle_name = None

    if vehicle:
        vehicle_name = vehicle.name or (
            f"{vehicle.manufacturer} {vehicle.model}"
        )

    # =========================================================
    # 3. AI RECOMMENDATION
    # =========================================================

    recommendation = None

    if vehicle and lat is not None and lon is not None:

        stations = (
            db.query(ChargingStation)
            .all()
        )

        ranked = recommend_stations(
            db=db,
            stations=stations,
            current_lat=lat,
            current_lon=lon,
            remaining_battery_percent=vehicle.remaining_battery_percent,
            vehicle_range_km=vehicle.vehicle_range_km,
            charger_type=vehicle.charger_type,
            max_results=1,
        )

        if ranked:
            result = ranked[0]
            station = result["station"]

            # Find the fastest compatible available charger.
            compatible_available = [
                charger
                for charger in station.chargers
                if (
                    charger.charger_type == vehicle.charger_type
                    and charger.status.value == "available"
                )
            ]

            charger_power_kw = (
                max(
                    (charger.power_kw for charger in compatible_available),
                    default=0,
                )
            )

            recommendation = {
                "station_id": station.id,
                "station_name": station.name,
                "distance_km": result["distance"],
                "wait_minutes": result["wait_minutes"],
                "charger_power_kw": charger_power_kw,
                "price_per_kwh": station.charging_cost_per_kwh,
                "score": result["score"],
                "reachable": result["reachable"],
                "reasons": result["reasons"],
            }

    # =========================================================
    # 4. ACTIVE BOOKING
    # =========================================================

    active_statuses = (
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.IN_PROGRESS,
    )

    active_booking = (
        db.query(Booking)
        .filter(
            Booking.user_id == current_user.id,
            Booking.status.in_(active_statuses),
        )
        .order_by(Booking.slot_start.asc())
        .first()
    )

    active_booking_data = None

    if active_booking:
        station = (
            db.query(ChargingStation)
            .filter(
                ChargingStation.id == active_booking.station_id
            )
            .first()
        )

        active_booking_data = {
            "id": active_booking.id,
            "station_name": (
                station.name
                if station
                else f"Station #{active_booking.station_id}"
            ),
            "start_time": (
                active_booking.slot_start.isoformat()
                if active_booking.slot_start
                else None
            ),
            "status": (
                active_booking.status.value
                if active_booking.status
                else None
            ),
        }

    # =========================================================
    # 5. ENERGY CONSUMPTION
    # =========================================================

    total_energy = (
        db.query(
            func.coalesce(
                func.sum(
                    ChargingSession.energy_consumed_kwh
                ),
                0.0,
            )
        )
        .filter(
            ChargingSession.user_id == current_user.id,
            ChargingSession.status == SessionStatus.COMPLETED,
        )
        .scalar()
    )

    total_energy = round(float(total_energy or 0), 2)

    # =========================================================
    # 6. CO2 SAVINGS
    # =========================================================

    co2_saved = round(
        total_energy * CO2_SAVED_PER_KWH,
        2,
    )

    # =========================================================
    # 7. RESPONSE
    # =========================================================

    return {
        "battery_percentage": battery_percentage,
        "range_km": range_km,
        "vehicle_name": vehicle_name,
        "recommendation": recommendation,
        "active_booking": active_booking_data,
        "energy_consumed_kwh": total_energy,
        "co2_saved_kg": co2_saved,
        "location_available": (
            lat is not None and lon is not None
        ),
        "vehicle_configured": vehicle is not None,
    }