from abc import ABC, abstractmethod


class BookingAdapter(ABC):

    @abstractmethod
    async def get_booking_info(self, station):
        pass