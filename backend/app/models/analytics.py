from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base
from app.models.enums import NotificationType


class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String(150), nullable=False)
    gst_number = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="operator_profile")
    stations = relationship("ChargingStation", back_populates="operator")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.SYSTEM)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


class ElectricityDemand(Base):
    __tablename__ = "electricity_demand"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    demand_kwh = Column(Float, nullable=False)
    granularity = Column(String(20), default="hourly")  # hourly/daily/weekly/monthly/seasonal


class QueuePrediction(Base):
    __tablename__ = "queue_predictions"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    predicted_at = Column(DateTime(timezone=True), server_default=func.now())
    queue_15min = Column(Float)
    queue_30min = Column(Float)
    queue_1hr = Column(Float)
    queue_2hr = Column(Float)
    peak_hour_queue = Column(Float)


class WaitingPrediction(Base):
    __tablename__ = "waiting_predictions"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    predicted_at = Column(DateTime(timezone=True), server_default=func.now())
    waiting_minutes = Column(Float)
    expected_start_time = Column(DateTime(timezone=True), nullable=True)
    expected_completion_time = Column(DateTime(timezone=True), nullable=True)


class RecommendationScore(Base):
    __tablename__ = "recommendation_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    score = Column(Float, nullable=False)
    reasons = Column(JSON, default=list)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())


class TrafficData(Base):
    __tablename__ = "traffic_data"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("charging_stations.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    congestion_level = Column(Float)  # 0-1


class WeatherData(Base):
    __tablename__ = "weather_data"

    id = Column(Integer, primary_key=True, index=True)
    city = Column(String(100), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    temperature_c = Column(Float)
    condition = Column(String(50))  # sunny/rainy/storm/etc
    is_holiday = Column(Boolean, default=False)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id"))
    report_type = Column(String(50))
    data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(150), nullable=False)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
