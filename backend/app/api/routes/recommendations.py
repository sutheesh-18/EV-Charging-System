from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, Vehicle
from app.models.station import ChargingStation
from app.models.analytics import RecommendationScore
from app.schemas.prediction import RecommendationRequest, RecommendationResponse, RecommendationItem
from app.services.recommendation_engine import recommend_stations

router = APIRouter(prefix="/recommendations", tags=["AI Recommendation Engine"])


@router.post("", response_model=RecommendationResponse)
def get_recommendations(payload: RecommendationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id, Vehicle.owner_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    stations = db.query(ChargingStation).all()
    ranked = recommend_stations(
        db=db,
        stations=stations,
        current_lat=payload.current_latitude,
        current_lon=payload.current_longitude,
        remaining_battery_percent=vehicle.remaining_battery_percent,
        vehicle_range_km=vehicle.vehicle_range_km,
        charger_type=vehicle.charger_type,
        max_results=payload.max_results,
    )

    items = []
    for r in ranked:
        station = r["station"]
        items.append(RecommendationItem(
            station_id=station.id,
            station_name=station.name,
            score=r["score"],
            distance_km=r["distance"],
            predicted_wait_minutes=r["wait_minutes"],
            charging_cost_per_kwh=station.charging_cost_per_kwh,
            reachable=r["reachable"],
            reasons=r["reasons"],
        ))
        db.add(RecommendationScore(
            user_id=current_user.id, station_id=station.id,
            score=r["score"], reasons=r["reasons"],
        ))
    db.commit()

    return RecommendationResponse(recommendations=items)
