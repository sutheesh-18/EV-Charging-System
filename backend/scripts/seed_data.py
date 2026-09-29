"""
Seeds the database with demo data: an admin, an operator, a driver, sample
vehicles, charging stations with chargers, and historical electricity demand
so the dashboards and forecast charts aren't empty on first run.

Run:  python -m scripts.seed_data   (from backend/ directory)
"""
import random
from datetime import datetime, timedelta

from app.db.database import SessionLocal, Base, engine
from app.models.user import User, Vehicle
from app.models.station import ChargingStation, Charger
from app.models.analytics import Operator, ElectricityDemand
from app.models.enums import UserRole, ChargerType, ChargerStatus
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def get_or_create_user(email, full_name, role, password="Password@123", phone=None):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(full_name=full_name, email=email, phone=phone, role=role, hashed_password=hash_password(password))
    db.add(user)
    db.flush()
    return user


def seed():
    admin = get_or_create_user("admin@evcharge.ai", "System Admin", UserRole.ADMIN)
    operator_user = get_or_create_user("operator@evcharge.ai", "GreenVolt Operator", UserRole.OPERATOR)
    driver = get_or_create_user("driver@evcharge.ai", "Asha Driver", UserRole.DRIVER)

    operator_profile = db.query(Operator).filter(Operator.user_id == operator_user.id).first()
    if not operator_profile:
        operator_profile = Operator(user_id=operator_user.id, company_name="GreenVolt Charging Pvt Ltd")
        db.add(operator_profile)
        db.flush()

    if not db.query(Vehicle).filter(Vehicle.owner_id == driver.id).first():
        db.add(Vehicle(
            owner_id=driver.id, name="My Nexon EV", manufacturer="Tata", model="Nexon EV Max",
            battery_capacity_kwh=40.5, remaining_battery_percent=62, charger_type=ChargerType.CCS,
            vehicle_range_km=437, charging_speed_kw=50, is_default=True,
        ))

    # Chennai-area demo stations
    stations_data = [
        {"name": "GreenVolt Hub - T Nagar", "address": "Pondy Bazaar, T Nagar", "city": "Chennai", "lat": 13.0418, "lon": 80.2341, "cost": 12.5},
        {"name": "GreenVolt Hub - OMR Tech Park", "address": "OMR, Sholinganallur", "city": "Chennai", "lat": 12.9010, "lon": 80.2279, "cost": 11.0},
        {"name": "GreenVolt Hub - Anna Nagar", "address": "2nd Avenue, Anna Nagar", "city": "Chennai", "lat": 13.0850, "lon": 80.2101, "cost": 13.0},
        {"name": "GreenVolt Hub - Velachery", "address": "Velachery Main Rd", "city": "Chennai", "lat": 12.9791, "lon": 80.2213, "cost": 10.5},
        {"name": "GreenVolt Hub - Airport", "address": "GST Road, Meenambakkam", "city": "Chennai", "lat": 12.9941, "lon": 80.1709, "cost": 14.0},
    ]

    if db.query(ChargingStation).count() == 0:
        for s in stations_data:
            station = ChargingStation(
                operator_id=operator_profile.id, name=s["name"], address=s["address"], city=s["city"],
                latitude=s["lat"], longitude=s["lon"], charging_cost_per_kwh=s["cost"],
                reliability_score=random.uniform(80, 98), average_rating=round(random.uniform(3.8, 4.9), 1),
                green_energy_percent=random.uniform(20, 60), amenities=["restroom", "cafe", "wifi"],
                total_chargers=0,
            )
            db.add(station)
            db.flush()

            n_chargers = random.randint(4, 8)
            for i in range(n_chargers):
                charger_type = random.choice([ChargerType.CCS, ChargerType.AC_TYPE2, ChargerType.CHADEMO])
                status = random.choices(
                    [ChargerStatus.AVAILABLE, ChargerStatus.OCCUPIED, ChargerStatus.FAULTY],
                    weights=[0.55, 0.4, 0.05],
                )[0]
                db.add(Charger(
                    station_id=station.id, charger_code=f"{station.name[:3].upper()}-{i+1:02d}",
                    charger_type=charger_type, power_kw=random.choice([22, 50, 60, 120]),
                    status=status, total_usage_hours=random.uniform(50, 4000),
                ))
            station.total_chargers = n_chargers

            # 3 days of hourly demand history for the forecast chart
            for h in range(72):
                ts = datetime.utcnow() - timedelta(hours=(72 - h))
                base = 12 + 8 * abs(((h % 24) - 18) / 18)
                db.add(ElectricityDemand(station_id=station.id, timestamp=ts, demand_kwh=round(base + random.uniform(-2, 2), 2)))

    db.commit()
    print("Seed complete.")
    print("Admin login:    admin@evcharge.ai / Password@123")
    print("Operator login: operator@evcharge.ai / Password@123")
    print("Driver login:   driver@evcharge.ai / Password@123")


if __name__ == "__main__":
    seed()
    db.close()
