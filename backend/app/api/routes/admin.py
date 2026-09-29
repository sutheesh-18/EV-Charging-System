from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.api.deps import require_roles
from app.models.user import User
from app.models.enums import UserRole
from app.models.station import ChargingStation, Charger
from app.models.booking import Booking, Payment
from app.models.analytics import ElectricityDemand

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get("/overview")
def admin_overview(db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    total_users = db.query(func.count(User.id)).filter(User.role == UserRole.DRIVER).scalar()
    total_operators = db.query(func.count(User.id)).filter(User.role == UserRole.OPERATOR).scalar()
    total_stations = db.query(func.count(ChargingStation.id)).scalar()
    total_chargers = db.query(func.count(Charger.id)).scalar()
    total_bookings = db.query(func.count(Booking.id)).scalar()
    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).scalar()
    total_demand = db.query(func.coalesce(func.sum(ElectricityDemand.demand_kwh), 0.0)).scalar()

    return {
        "total_users": total_users,
        "total_operators": total_operators,
        "total_stations": total_stations,
        "total_chargers": total_chargers,
        "total_bookings": total_bookings,
        "total_revenue": round(total_revenue, 2),
        "total_electricity_demand_kwh": round(total_demand, 2),
    }


@router.get("/users")
def list_all_users(db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    return db.query(User).all()


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN))):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_active = not user.is_active
        db.commit()
    return {"id": user_id, "is_active": user.is_active if user else None}
