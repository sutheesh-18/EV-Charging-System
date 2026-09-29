# VoltGrid — AI-Powered Smart EV Charging Network

An AI-driven EV charging decision support system: instead of just showing the
*nearest* charger, VoltGrid predicts future queue length, waiting time, and
electricity demand, then recommends the station that will actually get you
charged fastest — with a plain-language explanation of why.

> **Scope note:** This is a complete, working full-stack foundation — real
> auth, real database schema, real trained ML models, a real recommendation
> engine, and a working UI, all wired end-to-end and smoke-tested. It's sized
> as a strong MCA/portfolio-grade project and a solid base for further work,
> not a claim that every dashboard widget or diagram type from an enterprise
> spec is hand-built — see "What's included" below for the honest breakdown.

## What's included

**Backend (FastAPI + PostgreSQL)**
- JWT auth with 3 roles (driver / operator / admin)
- Full schema: users, vehicles, stations, chargers, bookings, sessions, payments, feedback, notifications, electricity demand, queue/waiting predictions, recommendation scores, traffic & weather data, maintenance logs, reports, audit logs
- REST APIs for auth, users/vehicles, stations, bookings (+QR codes), predictions, recommendations, analytics, operator dashboard, admin dashboard, notifications
- Rate limiting, CORS, password hashing, role-based authorization

**Machine learning**
- Queue prediction — XGBoost (5 horizons: 15min / 30min / 1hr / 2hr / peak)
- Waiting time prediction — Random Forest
- Electricity demand forecasting — LSTM (TensorFlow/Keras)
- Charger failure risk — LightGBM
- Multi-factor **recommendation engine** (distance, wait time, queue, cost, reliability, rating, charging speed, green energy) with human-readable explanations
- Runtime service falls back to sensible heuristics if models haven't been trained yet, so the API always works

**Frontend (React + TypeScript + Vite + Tailwind)**
- Landing, login, register
- Driver dashboard, interactive map with live recommendations (Leaflet), station details, booking flow with QR codes, bookings list, AI predictions charts (Chart.js), sustainability/carbon dashboard, charging history, profile & vehicle settings
- Operator dashboard, admin dashboard
- Custom design system (not a default template) — see `frontend/tailwind.config.js`

**DevOps & docs**
- Docker Compose (Postgres + FastAPI + Nginx-served React)
- SQL schema reference, architecture/ER/sequence/DFD diagrams (Mermaid), API reference, deployment guide, Postman collection

## What's intentionally lighter than the original spec

A handful of items from the full "everything" spec are represented structurally
(models/fields exist) but don't yet have dedicated UI or automated test suites:
route optimization via a live maps API, automated unit/integration test suites,
and some deeper admin analytics (per-report generation UI, audit log viewer).
The architecture makes all of these straightforward to add — the schema,
services layer, and API patterns are already in place.

## Quick start

```bash
docker compose up --build
docker compose exec backend python -m app.ml.train_queue_waiting
docker compose exec backend python -m app.ml.train_failure
docker compose exec backend python -m scripts.seed_data
```

Then open http://localhost and sign in with a seeded demo account:

| Role | Email | Password |
|---|---|---|
| Driver | driver@evcharge.ai | Password@123 |
| Operator | operator@evcharge.ai | Password@123 |
| Admin | admin@evcharge.ai | Password@123 |

Full setup instructions (with/without Docker, production notes): [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
API reference: [`docs/API.md`](docs/API.md)
Architecture & diagrams: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Project structure

```
voltgrid/
├── backend/
│   ├── app/
│   │   ├── core/          # config, security (JWT, password hashing)
│   │   ├── db/             # SQLAlchemy engine/session
│   │   ├── models/         # ORM models (23 tables)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── api/routes/     # REST endpoints
│   │   ├── services/       # recommendation engine, queue service
│   │   ├── ml/              # data generation, training scripts, prediction service
│   │   └── main.py
│   ├── scripts/seed_data.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/, context/, components/, pages/, types/
│   │   └── App.tsx, main.tsx
│   ├── Dockerfile, nginx.conf
├── database/schema.sql
├── docs/ (ARCHITECTURE.md, API.md, DEPLOYMENT.md)
├── postman/VoltGrid.postman_collection.json
└── docker-compose.yml
```

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS · React Router · Axios · TanStack Query · Chart.js · Leaflet · FastAPI · SQLAlchemy · PostgreSQL · JWT · scikit-learn · XGBoost · LightGBM · TensorFlow/Keras · Docker · Nginx
