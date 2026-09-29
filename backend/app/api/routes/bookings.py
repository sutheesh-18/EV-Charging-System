import base64
import io
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import qrcode

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.booking import Booking, Payment
from app.models.station import Charger, ChargingStation
from app.models.enums import BookingStatus, ChargerStatus, PaymentStatus
from app.schemas.booking import BookingCreate, BookingOut, PaymentOut
from app.ml.prediction_service import predict_waiting_time
from app.services.queue_service import get_live_queue

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def _generate_qr_base64(payload: str) -> str:
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    charger = db.query(Charger).filter(Charger.id == payload.charger_id, Charger.station_id == payload.station_id).first()
    if not charger:
        raise HTTPException(status_code=404, detail="Charger not found at this station")
    if charger.status not in (ChargerStatus.AVAILABLE, ChargerStatus.OCCUPIED):
        raise HTTPException(status_code=400, detail="Charger is not bookable (faulty/maintenance/offline)")

    station = db.query(ChargingStation).filter(ChargingStation.id == payload.station_id).first()
    live = get_live_queue(db, station)
    predicted_wait = predict_waiting_time(
        queue_length=live["current_queue"],
        active_chargers=live["total_chargers"] or 1,
    )

    booking = Booking(
        user_id=current_user.id,
        vehicle_id=payload.vehicle_id,
        station_id=payload.station_id,
        charger_id=payload.charger_id,
        slot_start=payload.slot_start,
        slot_end=payload.slot_end,
        estimated_arrival=payload.estimated_arrival,
        status=BookingStatus.CONFIRMED,
        predicted_wait_minutes=predicted_wait,
    )
    db.add(booking)
    db.flush()

    booking.qr_code = _generate_qr_base64(f"BOOKING:{booking.id}:USER:{current_user.id}:STATION:{station.id}")
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/me", response_model=List[BookingOut])
def my_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).all()


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == current_user.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == current_user.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status in (BookingStatus.COMPLETED, BookingStatus.CANCELLED):
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled")
    booking.status = BookingStatus.CANCELLED
    db.commit()
    db.refresh(booking)
    return booking


@router.post("/{booking_id}/pay", response_model=PaymentOut, status_code=201)
def pay_for_booking(booking_id: int, amount: float, method: str = "card", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == current_user.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    payment = Payment(booking_id=booking.id, user_id=current_user.id, amount=amount, method=method, status=PaymentStatus.SUCCESS, transaction_ref=f"TXN{booking.id}{int(amount*100)}")
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
