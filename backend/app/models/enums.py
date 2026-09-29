import enum


class UserRole(str, enum.Enum):
    DRIVER = "driver"
    OPERATOR = "operator"
    ADMIN = "admin"


class ChargerType(str, enum.Enum):
    AC_TYPE2 = "AC_Type2"
    CCS = "CCS"
    CHADEMO = "CHAdeMO"
    GB_T = "GB_T"


class ChargerStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    FAULTY = "faulty"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class SessionStatus(str, enum.Enum):
    ONGOING = "ongoing"
    COMPLETED = "completed"
    INTERRUPTED = "interrupted"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class NotificationType(str, enum.Enum):
    BOOKING = "booking"
    PROMO = "promo"
    SYSTEM = "system"
    MAINTENANCE = "maintenance"
