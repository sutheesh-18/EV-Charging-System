"""
Trains:
  1. Queue Prediction models (XGBoost) - one regressor per horizon
  2. Waiting Time Prediction model (RandomForest)

Run:  python -m app.ml.train_queue_waiting
"""
import os
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from xgboost import XGBRegressor

from app.ml.data_generator import generate_queue_dataset, generate_waiting_dataset

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

QUEUE_FEATURES = [
    "hour", "day_of_week", "is_holiday", "active_chargers",
    "historical_avg_queue", "booking_count", "weather_bad", "current_queue",
]
QUEUE_TARGETS = ["queue_15min", "queue_30min", "queue_1hr", "queue_2hr", "peak_hour_queue"]

WAITING_FEATURES = ["queue_length", "active_chargers", "avg_charging_duration_min", "incoming_vehicles"]


def train_queue_models():
    df = generate_queue_dataset()
    X = df[QUEUE_FEATURES]
    metrics = {}
    for target in QUEUE_TARGETS:
        y = df[target]
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        model = XGBRegressor(
            n_estimators=250, max_depth=5, learning_rate=0.06,
            subsample=0.9, colsample_bytree=0.9, random_state=42,
        )
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        metrics[target] = {"mae": round(float(mae), 3), "r2": round(float(r2), 3)}
        joblib.dump(model, os.path.join(MODELS_DIR, f"queue_{target}.joblib"))
        print(f"[queue:{target}] MAE={mae:.3f}  R2={r2:.3f}")

    joblib.dump(QUEUE_FEATURES, os.path.join(MODELS_DIR, "queue_features.joblib"))
    return metrics


def train_waiting_model():
    df = generate_waiting_dataset()
    X = df[WAITING_FEATURES]
    y = df["waiting_minutes"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"[waiting_time] MAE={mae:.3f}  R2={r2:.3f}")

    joblib.dump(model, os.path.join(MODELS_DIR, "waiting_time.joblib"))
    joblib.dump(WAITING_FEATURES, os.path.join(MODELS_DIR, "waiting_features.joblib"))
    return {"mae": round(float(mae), 3), "r2": round(float(r2), 3)}


if __name__ == "__main__":
    print("Training queue prediction models (XGBoost)...")
    train_queue_models()
    print("\nTraining waiting time model (RandomForest)...")
    train_waiting_model()
    print("\nAll models saved to", MODELS_DIR)
