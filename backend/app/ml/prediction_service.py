"""
Runtime prediction service. Loads trained models lazily and exposes simple
functions consumed by the API routes. If a model has not been trained yet
(e.g. fresh clone before running the training scripts), falls back to a
lightweight heuristic so the API keeps working end-to-end.
"""
import os
import joblib
import numpy as np
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Optional

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")


def _load(path: str):
    full = os.path.join(MODELS_DIR, path)
    if os.path.exists(full):
        return joblib.load(full)
    return None


@lru_cache(maxsize=1)
def _queue_models():
    targets = ["queue_15min", "queue_30min", "queue_1hr", "queue_2hr", "peak_hour_queue"]
    models = {t: _load(f"queue_{t}.joblib") for t in targets}
    features = _load("queue_features.joblib")
    return models, features


@lru_cache(maxsize=1)
def _waiting_model():
    return _load("waiting_time.joblib"), _load("waiting_features.joblib")


@lru_cache(maxsize=1)
def _failure_model():
    return _load("failure_model.joblib"), _load("failure_features.joblib")


def predict_queue(current_queue: int, active_chargers: int, booking_count: int,
                   historical_avg_queue: float = 3.0, weather_bad: int = 0,
                   at: Optional[datetime] = None) -> dict:
    at = at or datetime.utcnow()
    models, features = _queue_models()

    row = {
        "hour": at.hour,
        "day_of_week": at.weekday(),
        "is_holiday": 0,
        "active_chargers": active_chargers,
        "historical_avg_queue": historical_avg_queue,
        "booking_count": booking_count,
        "weather_bad": weather_bad,
        "current_queue": current_queue,
    }

    if models["queue_15min"] is not None and features is not None:
        import pandas as pd
        X = pd.DataFrame([[row[f] for f in features]], columns=features)
        result = {t: float(max(m.predict(X)[0], 0)) for t, m in models.items()}
    else:
        # Heuristic fallback (no trained model present yet)
        peak = 1.6 if (8 <= at.hour <= 10 or 18 <= at.hour <= 21) else 1.0
        base = current_queue + booking_count * 0.4
        result = {
            "queue_15min": round(base * 1.05, 1),
            "queue_30min": round(base * 1.10, 1),
            "queue_1hr": round(base * 1.15, 1),
            "queue_2hr": round(base * 0.95, 1),
            "peak_hour_queue": round(base * peak * 1.2, 1),
        }
    result["current_queue"] = current_queue
    return result


def predict_waiting_time(queue_length: int, active_chargers: int,
                          avg_charging_duration_min: float = 35.0,
                          incoming_vehicles: int = 0) -> float:
    model, features = _waiting_model()
    if model is not None and features is not None:
        import pandas as pd
        row = {
            "queue_length": queue_length,
            "active_chargers": active_chargers,
            "avg_charging_duration_min": avg_charging_duration_min,
            "incoming_vehicles": incoming_vehicles,
        }
        X = pd.DataFrame([[row[f] for f in features]], columns=features)
        return float(max(model.predict(X)[0], 0))

    # Heuristic fallback
    waiting = (queue_length * avg_charging_duration_min) / max(active_chargers, 1)
    return round(waiting + incoming_vehicles * 1.5, 1)


def predict_failure_risk(age_days: float, usage_hours: float,
                          avg_temp_c: float = 28.0, past_faults: int = 0) -> float:
    model, features = _failure_model()
    if model is not None and features is not None:
        import pandas as pd
        row = {
            "age_days": age_days, "usage_hours": usage_hours,
            "avg_temp_c": avg_temp_c, "past_faults": past_faults,
        }
        X = pd.DataFrame([[row[f] for f in features]], columns=features)
        return float(model.predict_proba(X)[0][1])

    # Heuristic fallback
    score = 0.0004 * age_days + 0.00006 * usage_hours + 0.08 * past_faults
    return float(1 / (1 + np.exp(-(score - 1.2))))


def predict_demand_forecast(recent_hourly_demand: list[float], horizon_hours: int = 24) -> list[float]:
    """Iteratively forecasts the next `horizon_hours` using the trained LSTM,
    or a seasonal-naive heuristic if the model isn't trained yet."""
    norm = _load("demand_norm.joblib")
    model_path = os.path.join(MODELS_DIR, "demand_lstm.keras")

    if norm is not None and os.path.exists(model_path):
        import tensorflow as tf
        model = tf.keras.models.load_model(model_path)
        mean, std, window = norm["mean"], norm["std"], norm["window"]

        series = list(recent_hourly_demand[-window:])
        if len(series) < window:
            series = [series[0]] * (window - len(series)) + series if series else [mean] * window

        norm_series = [(v - mean) / std for v in series]
        forecast = []
        for _ in range(horizon_hours):
            x = np.array(norm_series[-window:]).reshape(1, window, 1)
            pred = float(model.predict(x, verbose=0)[0][0])
            norm_series.append(pred)
            forecast.append(pred * std + mean)
        return [round(max(v, 0), 2) for v in forecast]

    # Heuristic fallback: repeat the daily seasonal pattern of the last 24h
    if not recent_hourly_demand:
        recent_hourly_demand = [15.0] * 24
    base = recent_hourly_demand[-24:]
    reps = (horizon_hours // len(base)) + 1
    return (base * reps)[:horizon_hours]
