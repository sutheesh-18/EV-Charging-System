# Deployment Guide

## Local development (Docker Compose — recommended)

**Prerequisites:** Docker & Docker Compose installed.

```bash
git clone <your-repo-url> voltgrid && cd voltgrid

cp backend/.env.example backend/.env
# edit backend/.env — at minimum change SECRET_KEY for anything beyond local dev

docker compose up --build
```

This starts three containers:

| Service | Container | Port |
|---|---|---|
| PostgreSQL 16 | `evcharge_db` | 5432 |
| FastAPI backend | `evcharge_backend` | 8000 |
| React frontend (Nginx) | `evcharge_frontend` | 80 |

Then, in a separate terminal, train the ML models and seed demo data (one-time):

```bash
docker compose exec backend python -m app.ml.train_queue_waiting
docker compose exec backend python -m app.ml.train_failure
docker compose exec backend python -m app.ml.train_demand   # optional, needs TensorFlow — slower
docker compose exec backend python -m scripts.seed_data
```

> The prediction API works even before training — it falls back to heuristic
> estimates — but training gives you the real ML-driven predictions described
> in the architecture doc.

Visit:
- Frontend: http://localhost
- API docs: http://localhost:8000/api/docs
- Health check: http://localhost:8000/api/health

## Local development (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL to point at your local Postgres, or use sqlite:///./dev.db for a quick start
python -m app.ml.train_queue_waiting
python -m app.ml.train_failure
python -m scripts.seed_data
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Production notes

- Set a strong, random `SECRET_KEY` and restrict `BACKEND_CORS_ORIGINS` to your real domain(s).
- Put the FastAPI backend behind a process manager (e.g. `uvicorn` with multiple workers via `gunicorn -k uvicorn.workers.UvicornWorker`) and a TLS-terminating reverse proxy / load balancer.
- Use managed PostgreSQL (RDS, Cloud SQL, etc.) with automated backups instead of the bundled container for production data.
- Replace `Base.metadata.create_all()` (used for developer convenience) with versioned Alembic migrations before your schema needs to evolve safely in production.
- Mount `backend/app/ml/saved_models` on persistent storage (or an object store) and set up the retraining pipeline (see below) on a schedule (e.g. nightly cron / Airflow / GitHub Actions) once you have real historical data flowing into `charging_sessions`, `electricity_demand`, `traffic_data`, and `weather_data`.
- Serve the frontend build as static files from a CDN in front of Nginx for lower latency at scale.

## ML retraining pipeline

The training scripts under `backend/app/ml/` are self-contained and reproducible:

```
app/ml/data_generator.py        # synthetic data (swap for real historical queries in production)
app/ml/train_queue_waiting.py   # XGBoost (queue) + RandomForest (waiting time)
app/ml/train_failure.py         # LightGBM (charger failure risk)
app/ml/train_demand.py          # LSTM / TensorFlow (electricity demand)
app/ml/prediction_service.py    # runtime inference, with heuristic fallback
```

To retrain against real data once you have production history, replace the
`generate_*` functions in `data_generator.py` with SQL queries against
`charging_sessions`, `bookings`, `electricity_demand`, `traffic_data`, and
`weather_data`, keeping the same output feature columns so the rest of the
pipeline needs no changes.
