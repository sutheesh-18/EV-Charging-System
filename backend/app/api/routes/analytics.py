from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.booking import ChargingSession
from app.models.enums import SessionStatus

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Approximate grid carbon intensity (kg CO2 per kWh) avoided by charging an EV
# vs an equivalent petrol vehicle - illustrative constant for the dashboard.
CO2_SAVED_PER_KWH = 0.7
KWH_PER_TREE_EQUIVALENT = 20.0


@router.get("/carbon-footprint/me")
def my_carbon_footprint(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_energy = (
        db.query(func.coalesce(func.sum(ChargingSession.energy_consumed_kwh), 0.0))
        .filter(ChargingSession.user_id == current_user.id, ChargingSession.status == SessionStatus.COMPLETED)
        .scalar()
    )
    carbon_saved = round(total_energy * CO2_SAVED_PER_KWH, 2)
    trees_equivalent = round(carbon_saved / KWH_PER_TREE_EQUIVALENT, 1)

    return {
        "energy_consumed_kwh": round(total_energy, 2),
        "carbon_saved_kg": carbon_saved,
        "trees_equivalent": trees_equivalent,
        "green_energy_used_percent": 32.5,
        "monthly_sustainability_score": min(round((total_energy / 5) + 40, 1), 100),
    }


@router.get("/spending/me")
def my_spending_pattern(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.booking import Payment, Booking
    total_spent = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .join(Booking, Booking.id == Payment.booking_id)
        .filter(Booking.user_id == current_user.id)
        .scalar()
    )
    session_count = (
        db.query(func.count(ChargingSession.id))
        .filter(ChargingSession.user_id == current_user.id)
        .scalar()
    )
    return {
        "total_spent": round(total_spent, 2),
        "total_sessions": session_count,
        "average_spend_per_session": round(total_spent / session_count, 2) if session_count else 0,
    }
