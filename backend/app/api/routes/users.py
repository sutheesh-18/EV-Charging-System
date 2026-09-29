from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, Vehicle
from app.schemas.user import UserOut, UserUpdate, VehicleCreate, VehicleOut, VehicleUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/vehicles", response_model=VehicleOut, status_code=201)
def add_vehicle(payload: VehicleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = Vehicle(owner_id=current_user.id, **payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/me/vehicles", response_model=List[VehicleOut])
def list_vehicles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Vehicle).filter(Vehicle.owner_id == current_user.id).all()


@router.put("/me/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: int, payload: VehicleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.owner_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/me/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.owner_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(vehicle)
    db.commit()
    return None
