from pydantic import BaseModel
from typing import List, Optional


class QueuePredictionOut(BaseModel):
    station_id: int
    current_queue: int
    queue_15min: float
    queue_30min: float
    queue_1hr: float
    queue_2hr: float
    peak_hour_queue: float


class WaitingPredictionOut(BaseModel):
    station_id: int
    waiting_minutes: float
    expected_start_time: str
    expected_completion_time: str


class DemandForecastOut(BaseModel):
    station_id: int
    horizon: str  # hourly/daily/weekly/monthly
    forecast: List[float]
    timestamps: List[str]


class RecommendationRequest(BaseModel):
    vehicle_id: int
    current_latitude: float
    current_longitude: float
    destination_latitude: Optional[float] = None
    destination_longitude: Optional[float] = None
    max_results: int = 5


class RecommendationItem(BaseModel):
    station_id: int
    station_name: str
    score: float
    distance_km: float
    predicted_wait_minutes: float
    charging_cost_per_kwh: float
    reachable: bool
    reasons: List[str]


class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationItem]
