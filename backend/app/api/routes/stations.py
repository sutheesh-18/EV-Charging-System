from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User
from app.models.station import (
    ChargingStation,
    Charger,
    Feedback,
    FavoriteStation,
)
from app.models.enums import UserRole
from app.schemas.station import (
    StationOut,
    StationCreate,
    StationNearby,
    ChargerOut,
    ChargerCreate,
    FeedbackCreate,
    FeedbackOut,
)
from app.services.recommendation_engine import haversine_km
from app.services.queue_service import get_live_queue


router = APIRouter(
    prefix="/stations",
    tags=["Charging Stations"],
)


# ============================================================
# LIST ALL STATIONS
# ============================================================

@router.get(
    "",
    response_model=List[StationOut],
)
def list_stations(
    city: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ChargingStation)

    if city:
        query = query.filter(
            ChargingStation.city.ilike(f"%{city}%")
        )

    return query.all()


# ============================================================
# NEARBY STATIONS
# ============================================================

@router.get(
    "/nearby",
    response_model=List[StationNearby],
)
def nearby_stations(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(15.0),
    db: Session = Depends(get_db),
):
    stations = db.query(ChargingStation).all()

    results = []

    for station in stations:
        distance = haversine_km(
            lat,
            lon,
            station.latitude,
            station.longitude,
        )

        if distance <= radius_km:
            live = get_live_queue(
                db,
                station,
            )

            results.append(
                StationNearby(
                    id=station.id,
                    name=station.name,
                    address=station.address,
                    latitude=station.latitude,
                    longitude=station.longitude,
                    distance_km=round(distance, 2),
                    available_chargers=live["available_chargers"],
                    total_chargers=live["total_chargers"],
                    charging_cost_per_kwh=(
                        station.charging_cost_per_kwh
                    ),
                    reliability_score=(
                        station.reliability_score
                    ),
                )
            )

    results.sort(
        key=lambda station: station.distance_km
    )

    return results


# ============================================================
# GET SINGLE STATION
# ============================================================

@router.get(
    "/{station_id}",
    response_model=StationOut,
)
def get_station(
    station_id: int,
    db: Session = Depends(get_db),
):
    station = (
        db.query(ChargingStation)
        .filter(
            ChargingStation.id == station_id
        )
        .first()
    )

    if not station:
        raise HTTPException(
            status_code=404,
            detail="Station not found",
        )

    return station


# ============================================================
# LIVE QUEUE FOR STATION
# ============================================================

@router.get(
    "/{station_id}/queue",
)
def station_live_queue(
    station_id: int,
    db: Session = Depends(get_db),
):
    station = (
        db.query(ChargingStation)
        .filter(
            ChargingStation.id == station_id
        )
        .first()
    )

    if not station:
        raise HTTPException(
            status_code=404,
            detail="Station not found",
        )

    return get_live_queue(
        db,
        station,
    )


# ============================================================
# CREATE CHARGING STATION
# ============================================================

@router.post(
    "",
    response_model=StationOut,
    status_code=201,
)
def create_station(
    payload: StationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new charging station.

    Only OPERATOR and ADMIN users are allowed.
    """

    # --------------------------------------------------------
    # Check user role
    # --------------------------------------------------------

    if current_user.role not in [
        UserRole.OPERATOR,
        UserRole.ADMIN,
    ]:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only operators and administrators "
                "can create stations"
            ),
        )

    # --------------------------------------------------------
    # Get operator profile
    # --------------------------------------------------------

    operator_id = None

    if current_user.operator_profile:
        operator_id = current_user.operator_profile.id

    # --------------------------------------------------------
    # Create station
    # --------------------------------------------------------

    station = ChargingStation(
        operator_id=operator_id,
        **payload.model_dump(),
    )

    db.add(station)

    try:
        db.commit()
        db.refresh(station)

    except Exception:
        db.rollback()
        raise

    return station


# ============================================================
# ADD CHARGER TO STATION
# ============================================================

@router.post(
    "/{station_id}/chargers",
    response_model=ChargerOut,
    status_code=201,
)
def add_charger(
    station_id: int,
    payload: ChargerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a charger to an existing charging station.

    Only OPERATOR and ADMIN users are allowed.
    """

    # --------------------------------------------------------
    # Check user role
    # --------------------------------------------------------

    if current_user.role not in [
        UserRole.OPERATOR,
        UserRole.ADMIN,
    ]:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only operators and administrators "
                "can add chargers"
            ),
        )

    # --------------------------------------------------------
    # Find station
    # --------------------------------------------------------

    station = (
        db.query(ChargingStation)
        .filter(
            ChargingStation.id == station_id
        )
        .first()
    )

    if not station:
        raise HTTPException(
            status_code=404,
            detail="Station not found",
        )

    # --------------------------------------------------------
    # Create charger
    # --------------------------------------------------------

    charger = Charger(
        station_id=station_id,
        **payload.model_dump(),
    )

    db.add(charger)

    # Update station charger count
    station.total_chargers = (
        station.total_chargers or 0
    ) + 1

    db.commit()
    db.refresh(charger)

    return charger


# ============================================================
# SUBMIT FEEDBACK
# ============================================================

@router.post(
    "/feedback",
    response_model=FeedbackOut,
    status_code=201,
)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit feedback for a charging station.
    """

    station = (
        db.query(ChargingStation)
        .filter(
            ChargingStation.id
            == payload.station_id
        )
        .first()
    )

    if not station:
        raise HTTPException(
            status_code=404,
            detail="Station not found",
        )

    feedback = Feedback(
        user_id=current_user.id,
        **payload.model_dump(),
    )

    db.add(feedback)
    db.flush()

    # --------------------------------------------------------
    # Update average rating
    # --------------------------------------------------------

    all_ratings = (
        db.query(Feedback)
        .filter(
            Feedback.station_id
            == station.id
        )
        .all()
    )

    if all_ratings:
        station.average_rating = round(
            sum(
                rating.rating
                for rating in all_ratings
            )
            / len(all_ratings),
            2,
        )

    db.commit()
    db.refresh(feedback)

    return feedback


# ============================================================
# ADD FAVORITE STATION
# ============================================================

@router.post(
    "/{station_id}/favorite",
    status_code=201,
)
def add_favorite(
    station_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a charging station to the user's favorites.
    """

    # Check station exists
    station = (
        db.query(ChargingStation)
        .filter(
            ChargingStation.id == station_id
        )
        .first()
    )

    if not station:
        raise HTTPException(
            status_code=404,
            detail="Station not found",
        )

    # Check if already favorite
    existing = (
        db.query(FavoriteStation)
        .filter_by(
            user_id=current_user.id,
            station_id=station_id,
        )
        .first()
    )

    if existing:
        return {
            "detail": "Already a favorite"
        }

    favorite = FavoriteStation(
        user_id=current_user.id,
        station_id=station_id,
    )

    db.add(favorite)
    db.commit()

    return {
        "detail": "Added to favorites"
    }


# ============================================================
# MY FAVORITE STATIONS
# ============================================================

@router.get(
    "/favorites/me",
    response_model=List[StationOut],
)
def my_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the current user's favorite charging stations.
    """

    favorites = (
        db.query(FavoriteStation)
        .filter_by(
            user_id=current_user.id
        )
        .all()
    )

    return [
        favorite.station
        for favorite in favorites
    ]