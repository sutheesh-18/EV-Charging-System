"""
Smart Queue Management service. Computes the *current* live queue at a
station from active bookings and ongoing charging sessions, which feeds
into the ML prediction models as the `current_queue` / `booking_count`
features.
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.station import ChargingStation, Charger
from app.models.booking import Booking, ChargingSession
from app.models.enums import BookingStatus, SessionStatus, ChargerStatus


def get_live_queue(db: Session, station: ChargingStation) -> dict:
    total_chargers = len(station.chargers)
    available = sum(1 for c in station.chargers if c.status == ChargerStatus.AVAILABLE)
    occupied = sum(1 for c in station.chargers if c.status == ChargerStatus.OCCUPIED)
    faulty = sum(1 for c in station.chargers if c.status in (ChargerStatus.FAULTY, ChargerStatus.MAINTENANCE, ChargerStatus.OFFLINE))

    active_sessions = (
        db.query(ChargingSession)
        .join(Charger, Charger.id == ChargingSession.charger_id)
        .filter(Charger.station_id == station.id, ChargingSession.status == SessionStatus.ONGOING)
        .count()
    )
    upcoming_bookings = (
        db.query(Booking)
        .filter(
            Booking.station_id == station.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            Booking.slot_start >= datetime.utcnow(),
        )
        .count()
    )

    current_queue = max(occupied - available, 0) + max(upcoming_bookings - available, 0)

    return {
        "total_chargers": total_chargers,
        "available_chargers": available,
        "occupied_chargers": occupied,
        "faulty_chargers": faulty,
        "active_sessions": active_sessions,
        "upcoming_bookings": upcoming_bookings,
        "current_queue": current_queue,
    }
