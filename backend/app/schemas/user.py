from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

from app.models.enums import UserRole, ChargerType


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: UserRole = UserRole.DRIVER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    profile_image: Optional[str] = None
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class VehicleBase(BaseModel):
    name: str
    manufacturer: str
    model: str
    battery_capacity_kwh: float
    remaining_battery_percent: float = 100.0
    charger_type: ChargerType
    vehicle_range_km: float
    charging_speed_kw: float
    is_default: bool = False


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    remaining_battery_percent: Optional[float] = None
    is_default: Optional[bool] = None


class VehicleOut(VehicleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: int
    created_at: datetime
