"""
Password hashing and JWT token utilities.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings


# ============================================================
# OAUTH2
# Used by FastAPI protected routes and Swagger Authorize
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/token"
)


# ============================================================
# PASSWORD HASHING
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    """
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """
    Verify a plain-text password against a bcrypt hash.
    """
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


# ============================================================
# ACCESS TOKEN
# ============================================================

def create_access_token(
    subject: str,
    role: str,
    expires_minutes: Optional[int] = None,
) -> str:
    """
    Create a JWT access token.
    """

    expire = datetime.utcnow() + timedelta(
        minutes=(
            expires_minutes
            or settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": subject,
        "role": role,
        "exp": expire,
        "type": "access",
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


# ============================================================
# REFRESH TOKEN
# ============================================================

def create_refresh_token(subject: str) -> str:
    """
    Create a JWT refresh token.
    """

    expire = datetime.utcnow() + timedelta(
        minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


# ============================================================
# DECODE TOKEN
# ============================================================

def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.

    Returns:
        dict: decoded JWT payload
        None: if token is invalid or expired
    """

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        return payload

    except JWTError:
        return None