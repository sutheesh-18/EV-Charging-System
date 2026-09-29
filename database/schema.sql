-- =====================================================================
-- VoltGrid EV Charging Network — PostgreSQL schema
-- This mirrors the SQLAlchemy models in backend/app/models/*.py.
-- The backend auto-creates these tables on startup (Base.metadata.create_all),
-- so running this file manually is optional — useful for review, direct
-- psql inspection, or if you prefer Alembic migrations seeded from here.
-- =====================================================================

CREATE TYPE user_role AS ENUM ('driver', 'operator', 'admin');
CREATE TYPE charger_type AS ENUM ('AC_Type2', 'CCS', 'CHAdeMO', 'GB_T');
CREATE TYPE charger_status AS ENUM ('available', 'occupied', 'faulty', 'maintenance', 'offline');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE session_status AS ENUM ('ongoing', 'completed', 'interrupted');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE notification_type AS ENUM ('booking', 'promo', 'system', 'maintenance');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'driver',
    is_active BOOLEAN DEFAULT TRUE,
    profile_image VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE operators (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(150) NOT NULL,
    gst_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    battery_capacity_kwh FLOAT NOT NULL,
    remaining_battery_percent FLOAT DEFAULT 100.0,
    charger_type charger_type NOT NULL,
    vehicle_range_km FLOAT NOT NULL,
    charging_speed_kw FLOAT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE charging_stations (
    id SERIAL PRIMARY KEY,
    operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    total_chargers INTEGER DEFAULT 0,
    charging_cost_per_kwh FLOAT DEFAULT 10.0,
    opening_time VARCHAR(10) DEFAULT '00:00',
    closing_time VARCHAR(10) DEFAULT '23:59',
    contact_number VARCHAR(20),
    is_24_7 BOOLEAN DEFAULT TRUE,
    reliability_score FLOAT DEFAULT 90.0,
    average_rating FLOAT DEFAULT 4.0,
    green_energy_percent FLOAT DEFAULT 30.0,
    images JSONB DEFAULT '[]',
    amenities JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stations_city ON charging_stations(city);
CREATE INDEX idx_stations_lat_lon ON charging_stations(latitude, longitude);

CREATE TABLE chargers (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    charger_code VARCHAR(50) NOT NULL,
    charger_type charger_type NOT NULL,
    power_kw FLOAT NOT NULL,
    status charger_status DEFAULT 'available',
    installed_on TIMESTAMPTZ DEFAULT now(),
    last_maintenance TIMESTAMPTZ,
    total_usage_hours FLOAT DEFAULT 0.0,
    failure_risk_score FLOAT DEFAULT 0.05,
    remaining_useful_life_days FLOAT DEFAULT 730
);
CREATE INDEX idx_chargers_station ON chargers(station_id);

CREATE TABLE favorite_stations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, station_id)
);

CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    rating FLOAT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    charger_id INTEGER NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    issue VARCHAR(255) NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    reported_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    charger_id INTEGER NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    slot_start TIMESTAMPTZ NOT NULL,
    slot_end TIMESTAMPTZ NOT NULL,
    estimated_arrival TIMESTAMPTZ,
    status booking_status DEFAULT 'pending',
    qr_code VARCHAR(255),
    predicted_wait_minutes FLOAT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_station ON bookings(station_id);

CREATE TABLE charging_sessions (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    charger_id INTEGER NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT now(),
    end_time TIMESTAMPTZ,
    energy_consumed_kwh FLOAT DEFAULT 0.0,
    status session_status DEFAULT 'ongoing',
    cost FLOAT DEFAULT 0.0
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount FLOAT NOT NULL,
    status payment_status DEFAULT 'pending',
    method VARCHAR(50) DEFAULT 'card',
    transaction_ref VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE electricity_demand (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT now(),
    demand_kwh FLOAT NOT NULL,
    granularity VARCHAR(20) DEFAULT 'hourly'
);
CREATE INDEX idx_demand_station_time ON electricity_demand(station_id, timestamp);

CREATE TABLE queue_predictions (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    predicted_at TIMESTAMPTZ DEFAULT now(),
    queue_15min FLOAT,
    queue_30min FLOAT,
    queue_1hr FLOAT,
    queue_2hr FLOAT,
    peak_hour_queue FLOAT
);

CREATE TABLE waiting_predictions (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    predicted_at TIMESTAMPTZ DEFAULT now(),
    waiting_minutes FLOAT,
    expected_start_time TIMESTAMPTZ,
    expected_completion_time TIMESTAMPTZ
);

CREATE TABLE recommendation_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    reasons JSONB DEFAULT '[]',
    computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE traffic_data (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES charging_stations(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT now(),
    congestion_level FLOAT
);

CREATE TABLE weather_data (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    temperature_c FLOAT,
    condition VARCHAR(50),
    is_holiday BOOLEAN DEFAULT FALSE
);

CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    report_type VARCHAR(50),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(150) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now()
);
