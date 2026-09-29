from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.api.deps import require_roles
from app.models.user import User
from app.models.enums import UserRole, ChargerStatus, SessionStatus
from app.models.station import ChargingStation, Charger
from app.models.booking import Booking, ChargingSession, Payment

router = APIRouter(prefix="/operator", tags=["Operator Dashboard"])


@router.get("/dashboard")
def operator_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN))):
    if not current_user.operator_profile:
        raise HTTPException(status_code=400, detail="No operator profile linked to this account")

    station_ids = [s.id for s in current_user.operator_profile.stations]
    total_chargers = db.query(func.count(Charger.id)).filter(Charger.station_id.in_(station_ids)).scalar() or 0
    occupied = db.query(func.count(Charger.id)).filter(Charger.station_id.in_(station_ids), Charger.status == ChargerStatus.OCCUPIED).scalar() or 0
    faulty = db.query(func.count(Charger.id)).filter(Charger.station_id.in_(station_ids), Charger.status == ChargerStatus.FAULTY).scalar() or 0

    revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .join(Booking, Booking.id == Payment.booking_id)
        .filter(Booking.station_id.in_(station_ids))
        .scalar()
    )
    total_bookings = db.query(func.count(Booking.id)).filter(Booking.station_id.in_(station_ids)).scalar() or 0
    energy_usage = (
        db.query(func.coalesce(func.sum(ChargingSession.energy_consumed_kwh), 0.0))
        .join(Charger, Charger.id == ChargingSession.charger_id)
        .filter(Charger.station_id.in_(station_ids))
        .scalar()
    )

    return {
        "total_stations": len(station_ids),
        "total_chargers": total_chargers,
        "live_occupancy_percent": round((occupied / total_chargers) * 100, 1) if total_chargers else 0,
        "faulty_chargers": faulty,
        "revenue": round(revenue, 2),
        "total_bookings": total_bookings,
        "electricity_usage_kwh": round(energy_usage, 2),
    }
