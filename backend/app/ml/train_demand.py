"""
Trains the Electricity Demand Forecasting model using an LSTM (TensorFlow/Keras).
Forecasts next-N-hours demand from a rolling window of past hourly demand.

Run:  python -m app.ml.train_demand
"""
import os
import numpy as np
import joblib

from app.ml.data_generator import generate_demand_timeseries

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

WINDOW = 24  # use past 24 hours to predict next hour


def build_windows(series: np.ndarray, window: int = WINDOW):
    X, y = [], []
    for i in range(len(series) - window):
        X.append(series[i:i + window])
        y.append(series[i + window])
    return np.array(X), np.array(y)


def train_demand_model():
    import tensorflow as tf
    from tensorflow.keras import layers, models

    df = generate_demand_timeseries()
    series = df["demand_kwh"].values.astype("float32")

    # Normalize
    mean, std = series.mean(), series.std()
    norm_series = (series - mean) / std

    X, y = build_windows(norm_series, WINDOW)
    X = X.reshape((X.shape[0], X.shape[1], 1))

    split = int(len(X) * 0.85)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = models.Sequential([
        layers.Input(shape=(WINDOW, 1)),
        layers.LSTM(64, return_sequences=True),
        layers.LSTM(32),
        layers.Dense(16, activation="relu"),
        layers.Dense(1),
    ])
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])

    model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=15, batch_size=32, verbose=2,
    )

    loss, mae = model.evaluate(X_test, y_test, verbose=0)
    print(f"[demand_lstm] test_loss={loss:.4f} test_mae={mae:.4f}")

    model.save(os.path.join(MODELS_DIR, "demand_lstm.keras"))
    joblib.dump({"mean": float(mean), "std": float(std), "window": WINDOW},
                os.path.join(MODELS_DIR, "demand_norm.joblib"))
    return {"test_loss": float(loss), "test_mae": float(mae)}


if __name__ == "__main__":
    train_demand_model()
