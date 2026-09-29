"""
Generates realistic synthetic datasets for training the prediction models.
In production these would be replaced by real historical data pulled from
the `charging_sessions`, `bookings`, `electricity_demand`, `traffic_data`
and `weather_data` tables.
"""
import numpy as np
import pandas as pd


def generate_queue_dataset(n_samples: int = 20000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    hour = rng.integers(0, 24, n_samples)
    day_of_week = rng.integers(0, 7, n_samples)  # 0=Mon
    is_holiday = rng.integers(0, 2, n_samples)
    active_chargers = rng.integers(2, 20, n_samples)
    historical_avg_queue = rng.uniform(0, 10, n_samples)
    booking_count = rng.integers(0, 15, n_samples)
    weather_bad = rng.integers(0, 2, n_samples)  # rain/storm reduces or increases queue depending on context

    # Peak hours: 8-10am and 6-9pm have higher base queue
    peak_factor = np.where(((hour >= 8) & (hour <= 10)) | ((hour >= 18) & (hour <= 21)), 1.6, 1.0)
    weekend_factor = np.where(day_of_week >= 5, 1.25, 1.0)
    holiday_factor = np.where(is_holiday == 1, 1.3, 1.0)

    base_queue = (booking_count * 0.5 + historical_avg_queue * 0.6) * peak_factor * weekend_factor * holiday_factor
    base_queue = base_queue / (active_chargers / 6.0 + 0.5)
    noise = rng.normal(0, 0.8, n_samples)
    current_queue = np.clip(base_queue + noise, 0, None)

    def project(mult, extra_noise_scale):
        return np.clip(current_queue * mult + rng.normal(0, extra_noise_scale, n_samples), 0, None)

    df = pd.DataFrame({
        "hour": hour,
        "day_of_week": day_of_week,
        "is_holiday": is_holiday,
        "active_chargers": active_chargers,
        "historical_avg_queue": historical_avg_queue,
        "booking_count": booking_count,
        "weather_bad": weather_bad,
        "current_queue": current_queue,
        "queue_15min": project(1.05, 0.4),
        "queue_30min": project(1.10, 0.6),
        "queue_1hr": project(1.15, 0.9),
        "queue_2hr": project(0.95, 1.2),
        "peak_hour_queue": np.clip(current_queue * peak_factor * 1.2 + rng.normal(0, 1.0, n_samples), 0, None),
    })
    return df


def generate_waiting_dataset(n_samples: int = 20000, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    queue_length = rng.integers(0, 20, n_samples)
    active_chargers = rng.integers(2, 20, n_samples)
    avg_charging_duration_min = rng.uniform(20, 60, n_samples)
    incoming_vehicles = rng.integers(0, 10, n_samples)

    waiting_minutes = (queue_length * avg_charging_duration_min) / np.maximum(active_chargers, 1)
    waiting_minutes = waiting_minutes + incoming_vehicles * 1.5
    waiting_minutes = np.clip(waiting_minutes + rng.normal(0, 5, n_samples), 0, None)

    df = pd.DataFrame({
        "queue_length": queue_length,
        "active_chargers": active_chargers,
        "avg_charging_duration_min": avg_charging_duration_min,
        "incoming_vehicles": incoming_vehicles,
        "waiting_minutes": waiting_minutes,
    })
    return df


def generate_demand_timeseries(n_hours: int = 24 * 90, seed: int = 11) -> pd.DataFrame:
    """Hourly electricity demand series (kWh) for LSTM training, ~90 days."""
    rng = np.random.default_rng(seed)
    t = np.arange(n_hours)
    hour_of_day = t % 24
    day = (t // 24) % 7

    daily_pattern = 15 + 10 * np.sin((hour_of_day - 6) / 24 * 2 * np.pi) ** 2
    weekend_boost = np.where(day >= 5, 4, 0)
    trend = t * 0.002
    noise = rng.normal(0, 2.0, n_hours)

    demand = np.clip(daily_pattern + weekend_boost + trend + noise, 0, None)
    df = pd.DataFrame({"hour_index": t, "demand_kwh": demand})
    return df


def generate_failure_dataset(n_samples: int = 8000, seed: int = 3) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    age_days = rng.uniform(1, 1500, n_samples)
    usage_hours = rng.uniform(10, 8000, n_samples)
    avg_temp_c = rng.uniform(15, 45, n_samples)
    past_faults = rng.integers(0, 6, n_samples)

    risk_score = (
        0.0004 * age_days
        + 0.00006 * usage_hours
        + 0.01 * (avg_temp_c - 25).clip(min=0)
        + 0.08 * past_faults
    )
    risk_score = 1 / (1 + np.exp(-(risk_score - 1.2)))  # squashed to 0-1
    failure_within_30_days = (rng.uniform(0, 1, n_samples) < risk_score).astype(int)

    df = pd.DataFrame({
        "age_days": age_days,
        "usage_hours": usage_hours,
        "avg_temp_c": avg_temp_c,
        "past_faults": past_faults,
        "failure_within_30_days": failure_within_30_days,
    })
    return df
