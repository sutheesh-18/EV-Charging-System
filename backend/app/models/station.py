from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base
from app.models.enums import ChargerType, ChargerStatus


class ChargingStation(Base):
    __tablename__ = "charging_stations"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=True)
    name = Column(String(150), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_chargers = Column(Integer, default=0)
    charging_cost_per_kwh = Column(Float, default=10.0)
    opening_time = Column(String(10), default="00:00")
    closing_time = Column(String(10), default="23:59")
    contact_number = Column(String(20), nullable=True)
    is_24_7 = Column(Boolean, default=True)
    reliability_score = Column(Float, default=90.0)  # 0-100
    average_rating = Column(Float, default=4.0)
    green_energy_percent = Column(Float, default=30.0)
    images = Column(JSON, default=list)
    amenities = Column(JSON, default=list)  # e.g. ["restroom","cafe","wifi"]
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    operator = relationship("Operator", back_populates="stations")
    chargers = relationship("Charger", back_populates="station", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="station")
    feedbacks = relationship("Feedback", back_populates="station")


class Charger(Base):
    __tablename__ = "chargers"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    charger_code = Column(String(50), nullable=False)
    charger_type = Column(Enum(ChargerType), nullable=False)
    power_kw = Column(Float, nullable=False)
    status = Column(Enum(ChargerStatus), default=ChargerStatus.AVAILABLE)
    installed_on = Column(DateTime(timezone=True), server_default=func.now())
    last_maintenance = Column(DateTime(timezone=True), nullable=True)
    total_usage_hours = Column(Float, default=0.0)
    failure_risk_score = Column(Float, default=0.05)  # ML predicted 0-1
    remaining_useful_life_days = Column(Float, default=730)

    station = relationship("ChargingStation", back_populates="chargers")
    sessions = relationship("ChargingSession", back_populates="charger")


class FavoriteStation(Base):
    __tablename__ = "favorite_stations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="favorite_stations")
    station = relationship("ChargingStation")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    rating = Column(Float, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="feedbacks")
    station = relationship("ChargingStation", back_populates="feedbacks")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    charger_id = Column(Integer, ForeignKey("chargers.id"), nullable=False)
    issue = Column(String(255), nullable=False)
    resolved = Column(Boolean, default=False)
    reported_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
