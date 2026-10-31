
from .base import BookingAdapter


class OperatorAPIAdapter(BookingAdapter):

    async def get_booking_info(self, station):
        """
        Future integration with charging operator APIs.

        This will retrieve live booking information
        when an operator provides API access.
        """
        raise NotImplementedError(
            "Direct operator API integration is not configured yet."
        )

    async def create_booking(self, request):
        raise NotImplementedError(
            "Operator reservation API is not configured yet."
        )

    async def cancel_booking(self, booking_id):
        raise NotImplementedError(
            "Operator cancellation API is not configured yet."
        )
