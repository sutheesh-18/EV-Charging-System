from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    phone = payload.phone.strip() if payload.phone else None

    if phone == "":
        phone = None

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Email or phone already registered",
        )

    return user


# ============================================================
# NORMAL LOGIN - USED BY REACT FRONTEND
# ============================================================

@router.post(
    "/login",
    response_model=Token,
)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )

    if not user or not verify_password(
        payload.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account disabled",
        )

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
    )

    refresh_token = create_refresh_token(
        subject=str(user.id)
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user,
    )


# ============================================================
# OAUTH2 TOKEN LOGIN - USED BY SWAGGER AUTHORIZE
# ============================================================

@router.post(
    "/token",
    tags=["Authentication"],
)
def oauth2_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    OAuth2-compatible login endpoint used by Swagger UI.

    Swagger sends:
        username = user email
        password = user password

    This endpoint returns a bearer access token.
    """

    # In our application, OAuth2 username = email
    user = (
        db.query(User)
        .filter(User.email == form_data.username)
        .first()
    )

    if not user or not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# ============================================================
# REFRESH TOKEN
# ============================================================

@router.post(
    "/refresh",
    response_model=Token,
)
def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db),
):
    payload = decode_token(refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token",
        )

    user = (
        db.query(User)
        .filter(User.id == int(payload["sub"]))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    new_access = create_access_token(
        subject=str(user.id),
        role=user.role.value,
    )

    new_refresh = create_refresh_token(
        subject=str(user.id)
    )

    return Token(
        access_token=new_access,
        refresh_token=new_refresh,
        user=user,
    )