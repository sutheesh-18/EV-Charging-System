import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.db.database import Base, engine
from app.models import *  # noqa: F401,F403

from app.api.routes import (
    auth,
    users,
    stations,
    bookings,
    predictions,
    recommendations,
    analytics,
    operator,
    admin,
    notifications,
    dashboard,
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger("evcharge")


# ============================================================
# RATE LIMITER
# ============================================================

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT],
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "AI-powered EV charging decision support system: "
        "predictive queue management, intelligent station "
        "recommendation, and demand forecasting."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


# ============================================================
# RATE LIMITER CONFIGURATION
# ============================================================

app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE STARTUP
# ============================================================

@app.on_event("startup")
def on_startup():
    """
    Verify/create database tables when the application starts.
    """

    Base.metadata.create_all(bind=engine)

    logger.info(
        "Database tables verified/created."
    )


# ============================================================
# GLOBAL EXCEPTION HANDLER
# ============================================================

@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    """
    Return a JSON response instead of exposing an HTML error page.
    """

    import traceback

    traceback.print_exc()

    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": exc.__class__.__name__,
        },
    )


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to EV Charging System API",
        "docs": "/api/docs",
        "health": "/api/health",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/api/health",
    tags=["Health"],
)
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
    }


# ============================================================
# API PREFIX
# ============================================================

API_PREFIX = settings.API_V1_PREFIX


# ============================================================
# API ROUTES
# ============================================================

app.include_router(
    auth.router,
    prefix=API_PREFIX,
)

app.include_router(
    users.router,
    prefix=API_PREFIX,
)

app.include_router(
    stations.router,
    prefix=API_PREFIX,
)

app.include_router(
    bookings.router,
    prefix=API_PREFIX,
)

app.include_router(
    predictions.router,
    prefix=API_PREFIX,
)

app.include_router(
    recommendations.router,
    prefix=API_PREFIX,
)

app.include_router(
    analytics.router,
    prefix=API_PREFIX,
)

app.include_router(
    operator.router,
    prefix=API_PREFIX,
)

app.include_router(
    admin.router,
    prefix=API_PREFIX,
)

app.include_router(
    notifications.router,
    prefix=API_PREFIX,
)

# Driver dashboard
app.include_router(
    dashboard.router,
    prefix=API_PREFIX,
)