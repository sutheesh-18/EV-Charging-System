from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from app.models.enums import BookingStatus, PaymentStatus


class BookingCreate(BaseModel):
    vehicle_id: int
    station_id: int
    charger_id: int
    slot_start: datetime
    slot_end: datetime
    estimated_arrival: Optional[datetime] = None


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    vehicle_id: int
    station_id: int
    charger_id: int
    slot_start: datetime
    slot_end: datetime
    status: BookingStatus
    qr_code: Optional[str]
    predicted_wait_minutes: Optional[float]
    created_at: datetime


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    booking_id: int
    amount: float
    status: PaymentStatus
    method: str
    created_at: datetime
