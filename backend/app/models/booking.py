from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base
from app.models.enums import BookingStatus, SessionStatus, PaymentStatus


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    charger_id = Column(Integer, ForeignKey("chargers.id"), nullable=False)
    slot_start = Column(DateTime(timezone=True), nullable=False)
    slot_end = Column(DateTime(timezone=True), nullable=False)
    estimated_arrival = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    qr_code = Column(Text, nullable=True)
    predicted_wait_minutes = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bookings")
    vehicle = relationship("Vehicle", back_populates="bookings")
    station = relationship("ChargingStation", back_populates="bookings")
    charger = relationship("Charger")
    session = relationship("ChargingSession", back_populates="booking", uselist=False)
    payment = relationship("Payment", back_populates="booking", uselist=False)


class ChargingSession(Base):
    __tablename__ = "charging_sessions"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    charger_id = Column(Integer, ForeignKey("chargers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    energy_consumed_kwh = Column(Float, default=0.0)
    status = Column(Enum(SessionStatus), default=SessionStatus.ONGOING)
    cost = Column(Float, default=0.0)

    charger = relationship("Charger", back_populates="sessions")
    booking = relationship("Booking", back_populates="session")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    method = Column(String(50), default="card")
    transaction_ref = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    booking = relationship("Booking", back_populates="payment")
