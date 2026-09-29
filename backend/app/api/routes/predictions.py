from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.station import ChargingStation
from app.models.analytics import ElectricityDemand
from app.ml.prediction_service import (
    predict_queue, predict_waiting_time, predict_demand_forecast, predict_failure_risk,
)
from app.services.queue_service import get_live_queue
from app.schemas.prediction import QueuePredictionOut, WaitingPredictionOut, DemandForecastOut

router = APIRouter(prefix="/predictions", tags=["AI Predictions"])


@router.get("/queue/{station_id}", response_model=QueuePredictionOut)
def queue_prediction(station_id: int, db: Session = Depends(get_db)):
    station = db.query(ChargingStation).filter(ChargingStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    live = get_live_queue(db, station)
    result = predict_queue(
        current_queue=live["current_queue"],
        active_chargers=live["total_chargers"] or 1,
        booking_count=live["upcoming_bookings"],
    )
    return QueuePredictionOut(station_id=station_id, **result)


@router.get("/waiting-time/{station_id}", response_model=WaitingPredictionOut)
def waiting_time_prediction(station_id: int, db: Session = Depends(get_db)):
    station = db.query(ChargingStation).filter(ChargingStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    live = get_live_queue(db, station)
    wait = predict_waiting_time(
        queue_length=live["current_queue"],
        active_chargers=live["total_chargers"] or 1,
    )
    now = datetime.utcnow()
    start = now + timedelta(minutes=wait)
    completion = start + timedelta(minutes=35)
    return WaitingPredictionOut(
        station_id=station_id,
        waiting_minutes=wait,
        expected_start_time=start.isoformat(),
        expected_completion_time=completion.isoformat(),
    )


@router.get("/demand/{station_id}", response_model=DemandForecastOut)
def demand_forecast(station_id: int, horizon_hours: int = 24, db: Session = Depends(get_db)):
    station = db.query(ChargingStation).filter(ChargingStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    recent = (
        db.query(ElectricityDemand)
        .filter(ElectricityDemand.station_id == station_id)
        .order_by(ElectricityDemand.timestamp.desc())
        .limit(24)
        .all()
    )
    recent_values = [r.demand_kwh for r in reversed(recent)] if recent else []
    forecast = predict_demand_forecast(recent_values, horizon_hours=horizon_hours)

    now = datetime.utcnow()
    timestamps = [(now + timedelta(hours=i + 1)).isoformat() for i in range(horizon_hours)]
    return DemandForecastOut(station_id=station_id, horizon="hourly", forecast=forecast, timestamps=timestamps)


@router.get("/charger-failure/{charger_id}")
def charger_failure_prediction(charger_id: int, db: Session = Depends(get_db)):
    from app.models.station import Charger
    charger = db.query(Charger).filter(Charger.id == charger_id).first()
    if not charger:
        raise HTTPException(status_code=404, detail="Charger not found")

    age_days = max((datetime.utcnow() - charger.installed_on.replace(tzinfo=None)).days, 1) if charger.installed_on else 100
    risk = predict_failure_risk(
        age_days=age_days,
        usage_hours=charger.total_usage_hours,
        past_faults=0,
    )
    charger.failure_risk_score = round(risk, 3)
    charger.remaining_useful_life_days = round(max(1500 - age_days * (1 + risk * 5), 30), 1)
    db.commit()
    return {
        "charger_id": charger_id,
        "failure_risk": charger.failure_risk_score,
        "remaining_useful_life_days": charger.remaining_useful_life_days,
        "maintenance_recommended": risk > 0.5,
    }
