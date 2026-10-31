
from sqlalchemy.orm import Session

from app.models.station import ChargingStation
from app.services.opencharge_map import get_station_by_id
from app.services.station_normalizer import normalize_ocm_station

from .link_adapter import ExternalLinkAdapter


class BookingService:

    def __init__(self):
        self.external_adapter = ExternalLinkAdapter()

    async def get_booking_options(
        self,
        source: str,
        station_id: int | None = None,
        external_id: int | None = None,
        db: Session | None = None,
    ):

        # 1. VoltGrid internal station
        if source == "voltgrid":

            if station_id is None or db is None:
                raise ValueError(
                    "VoltGrid station ID and database session are required."
                )

            station = (
                db.query(ChargingStation)
                .filter(ChargingStation.id == station_id)
                .first()
            )

            if not station:
                return None

            return {
                "source": "voltgrid",
                "station_id": station.id,
                "station_name": station.name,
                "method": "internal_booking",
                "booking_supported": True,
                "booking_endpoint": "/api/v1/bookings",
                "message": "Book directly through VoltGrid"
            }

        # 2. External Open Charge Map station
        if source == "openchargemap":

            if external_id is None or external_id <= 0:
                raise ValueError(
                    "A valid Open Charge Map station ID is required."
                )

            raw_station = await get_station_by_id(external_id)

            if not raw_station:
                return None

            station = normalize_ocm_station(raw_station)

            # Verify the provider returned the requested station.
            if station.get("external_id") != external_id:
                return None

            booking_info = await self.external_adapter.get_booking_info(
                station
            )

            return {
                "source": "openchargemap",
                "external_id": external_id,
                "station_name": station["name"],
                **booking_info
            }

        raise ValueError("Unsupported station source.")


booking_service = BookingService()
