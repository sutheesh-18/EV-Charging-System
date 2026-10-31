
from urllib.parse import urlparse


class ExternalLinkAdapter:

    @staticmethod
    def get_value(station, field):
        if isinstance(station, dict):
            return station.get(field)

        return getattr(station, field, None)

    @staticmethod
    def is_valid_https_url(url):
        if not isinstance(url, str):
            return False

        try:
            parsed = urlparse(url)

            return (
                parsed.scheme == "https"
                and bool(parsed.hostname)
                and not parsed.username
                and not parsed.password
            )
        except ValueError:
            return False

    async def get_booking_info(self, station):

        booking_url = self.get_value(station, "booking_url")
        operator_url = self.get_value(
            station, "operator_website_url"
        )

        if self.is_valid_https_url(booking_url):
            return {
                "method": "external_link",
                "booking_supported": True,
                "booking_url": booking_url,
                "operator_website_url": operator_url,
                "message": "Continue to operator booking"
            }

        if self.is_valid_https_url(operator_url):
            return {
                "method": "operator_website",
                "booking_supported": False,
                "booking_url": None,
                "operator_website_url": operator_url,
                "message": "Check booking options with the operator"
            }

        return {
            "method": "unavailable",
            "booking_supported": False,
            "booking_url": None,
            "operator_website_url": None,
            "message": "Online booking information unavailable"
        }
