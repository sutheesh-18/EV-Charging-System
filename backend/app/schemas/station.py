from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

from app.models.enums import ChargerType, ChargerStatus


class ChargerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    charger_code: str
    charger_type: ChargerType
    power_kw: float
    status: ChargerStatus
    failure_risk_score: float
    remaining_useful_life_days: float


class ChargerCreate(BaseModel):
    charger_code: str
    charger_type: ChargerType
    power_kw: float


class StationCreate(BaseModel):
    name: str
    address: str
    city: Optional[str] = None
    latitude: float
    longitude: float
    charging_cost_per_kwh: float = 10.0
    opening_time: str = "00:00"
    closing_time: str = "23:59"
    contact_number: Optional[str] = None
    is_24_7: bool = True
    amenities: List[str] = []


class StationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    address: str
    city: Optional[str]
    latitude: float
    longitude: float
    total_chargers: int
    charging_cost_per_kwh: float
    reliability_score: float
    average_rating: float
    green_energy_percent: float
    is_24_7: bool
    amenities: List[str] = []
    chargers: List[ChargerOut] = []


class StationNearby(BaseModel):
    id: int
    name: str
    address: str
    latitude: float
    longitude: float
    distance_km: float
    available_chargers: int
    total_chargers: int
    charging_cost_per_kwh: float
    reliability_score: float


class UnifiedStation(BaseModel):
    source: str

    id: int | None = None
    external_id: int | None = None

    name: str
    address: str

    latitude: float
    longitude: float

    distance_km: float | None = None

    operator: str | None = None

    available_chargers: int | None = None
    total_chargers: int | None = None

    charging_cost_per_kwh: float | None = None
    reliability_score: float | None = None

    status: str | None = None
    is_operational: bool | None = None

    usage_type: str | None = None
    is_pay_at_location: bool | None = None
    is_membership_required: bool | None = None

    connectors: list[dict] = [] 


class FeedbackCreate(BaseModel):
    station_id: int
    rating: float
    comment: Optional[str] = None


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    station_id: int
    rating: float
    comment: Optional[str]
    created_at: datetime
