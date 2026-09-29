"""
Trains the Charger Failure Prediction model (LightGBM classifier) which
estimates failure risk / remaining useful life inputs.

Run:  python -m app.ml.train_failure
"""
import os
import joblib
from lightgbm import LGBMClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

from app.ml.data_generator import generate_failure_dataset

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

FAILURE_FEATURES = ["age_days", "usage_hours", "avg_temp_c", "past_faults"]


def train_failure_model():
    df = generate_failure_dataset()
    X = df[FAILURE_FEATURES]
    y = df["failure_within_30_days"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = LGBMClassifier(n_estimators=200, max_depth=6, learning_rate=0.05, random_state=42, verbose=-1)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, preds)
    auc = roc_auc_score(y_test, proba)
    print(f"[failure_prediction] Accuracy={acc:.3f}  AUC={auc:.3f}")

    joblib.dump(model, os.path.join(MODELS_DIR, "failure_model.joblib"))
    joblib.dump(FAILURE_FEATURES, os.path.join(MODELS_DIR, "failure_features.joblib"))
    return {"accuracy": round(float(acc), 3), "auc": round(float(auc), 3)}


if __name__ == "__main__":
    train_failure_model()
