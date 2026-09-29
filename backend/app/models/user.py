from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base
from app.models.enums import UserRole, ChargerType


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.DRIVER, nullable=False)
    is_active = Column(Boolean, default=True)
    profile_image = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    favorite_stations = relationship("FavoriteStation", back_populates="user", cascade="all, delete-orphan")
    operator_profile = relationship("Operator", back_populates="user", uselist=False)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    manufacturer = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    battery_capacity_kwh = Column(Float, nullable=False)
    remaining_battery_percent = Column(Float, default=100.0)
    charger_type = Column(Enum(ChargerType), nullable=False)
    vehicle_range_km = Column(Float, nullable=False)
    charging_speed_kw = Column(Float, nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="vehicles")
    bookings = relationship("Booking", back_populates="vehicle")
