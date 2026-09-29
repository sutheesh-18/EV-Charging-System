# System Architecture & Diagrams

All diagrams are written in [Mermaid](https://mermaid.js.org/) syntax. GitHub, GitLab, and most modern
Markdown viewers render these automatically. You can also paste any block into https://mermaid.live to view/export as an image.

---

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        WEB["React + TypeScript SPA<br/>(Vite, Tailwind, Chart.js, Leaflet)"]
    end

    subgraph Edge["Edge / Delivery"]
        NGINX["Nginx<br/>static hosting + reverse proxy"]
    end

    subgraph API["Application Layer"]
        FASTAPI["FastAPI Backend<br/>REST API, JWT Auth, Rate limiting"]
        ML["ML Prediction Service<br/>XGBoost / RandomForest / LightGBM / LSTM"]
        REC["Recommendation Engine<br/>multi-factor weighted scoring"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL<br/>23 normalized tables")]
        MODELS[("Trained model artifacts<br/>.joblib / .keras")]
    end

    WEB -->|HTTPS/JSON| NGINX --> FASTAPI
    FASTAPI --> PG
    FASTAPI --> ML
    FASTAPI --> REC
    ML --> MODELS
    REC --> ML
    REC --> PG
```

---

## 2. Use Case Diagram

```mermaid
flowchart LR
    Driver((EV Driver))
    Operator((Station Operator))
    Admin((Administrator))

    Driver --> UC1[Register / Login]
    Driver --> UC2[Register Vehicle]
    Driver --> UC3[Search Nearby Stations]
    Driver --> UC4[Get AI Recommendation]
    Driver --> UC5[Book Charging Slot]
    Driver --> UC6[View Predictions]
    Driver --> UC7[Track Carbon Footprint]
    Driver --> UC8[Submit Feedback]

    Operator --> UC9[Manage Stations & Chargers]
    Operator --> UC10[View Operator Dashboard]
    Operator --> UC11[Monitor Maintenance Alerts]

    Admin --> UC12[Manage Users & Operators]
    Admin --> UC13[View Platform Analytics]
    Admin --> UC14[View AI Insights]
```

---

## 3. Class Diagram (core domain)

```mermaid
classDiagram
    class User {
        +int id
        +string full_name
        +string email
        +UserRole role
        +bool is_active
    }
    class Vehicle {
        +int id
        +float battery_capacity_kwh
        +float remaining_battery_percent
        +ChargerType charger_type
        +float vehicle_range_km
    }
    class ChargingStation {
        +int id
        +string name
        +float latitude
        +float longitude
        +float charging_cost_per_kwh
        +float reliability_score
    }
    class Charger {
        +int id
        +ChargerType charger_type
        +float power_kw
        +ChargerStatus status
        +float failure_risk_score
    }
    class Booking {
        +int id
        +datetime slot_start
        +BookingStatus status
        +float predicted_wait_minutes
    }
    class ChargingSession {
        +float energy_consumed_kwh
        +SessionStatus status
    }
    class Payment {
        +float amount
        +PaymentStatus status
    }

    User "1" --> "many" Vehicle
    User "1" --> "many" Booking
    ChargingStation "1" --> "many" Charger
    ChargingStation "1" --> "many" Booking
    Charger "1" --> "many" ChargingSession
    Booking "1" --> "0..1" ChargingSession
    Booking "1" --> "0..1" Payment
```

---

## 4. Sequence Diagram — Smart Recommendation & Booking Flow

```mermaid
sequenceDiagram
    participant U as EV Driver (App)
    participant API as FastAPI Backend
    participant Q as Queue Service
    participant ML as ML Prediction Service
    participant REC as Recommendation Engine
    participant DB as PostgreSQL

    U->>API: POST /recommendations {vehicle_id, lat, lon}
    API->>DB: Fetch all stations + chargers
    API->>REC: recommend_stations(stations, vehicle, location)
    loop for each reachable station
        REC->>Q: get_live_queue(station)
        Q->>DB: count active bookings/sessions
        REC->>ML: predict_queue(), predict_waiting_time()
        ML-->>REC: queue & wait predictions
    end
    REC-->>API: ranked stations + explanations
    API-->>U: RecommendationResponse

    U->>API: POST /bookings {station, charger, slot}
    API->>Q: get_live_queue(station)
    API->>ML: predict_waiting_time()
    API->>DB: INSERT booking + generate QR
    API-->>U: BookingOut (confirmed, QR code)
```

---

## 5. Data Flow Diagram — Level 0 (Context)

```mermaid
flowchart LR
    Driver([EV Driver])
    Operator([Operator])
    Admin([Admin])
    SYS[["VoltGrid EV Charging<br/>Decision Support System"]]

    Driver -->|Location, battery, preferences| SYS
    SYS -->|Recommendations, predictions, bookings| Driver
    Operator -->|Station/charger data| SYS
    SYS -->|Analytics, alerts| Operator
    Admin -->|Platform config| SYS
    SYS -->|Reports, insights| Admin
```

---

## 6. Data Flow Diagram — Level 1

```mermaid
flowchart TB
    D([Driver]) --> P1[1.0 Authenticate User]
    D --> P2[2.0 Manage Vehicles]
    D --> P3[3.0 Discover Stations]
    D --> P4[4.0 Generate Recommendation]
    D --> P5[5.0 Manage Bookings]

    P1 --> DS1[(Users)]
    P2 --> DS2[(Vehicles)]
    P3 --> DS3[(ChargingStations, Chargers)]
    P4 --> DS4[(QueuePredictions, WaitingPredictions, RecommendationScores)]
    P4 --> P6[6.0 Run ML Prediction Models]
    P6 --> DS5[(ElectricityDemand, TrafficData, WeatherData)]
    P5 --> DS6[(Bookings, ChargingSessions, Payments)]
```

---

## 7. Data Flow Diagram — Level 2 (Recommendation subsystem)

```mermaid
flowchart TB
    IN["4.0 Generate Recommendation<br/>input: vehicle, lat/lon"] --> S1[4.1 Filter stations by charger compatibility]
    S1 --> S2[4.2 Compute distance & reachability]
    S2 --> S3[4.3 Fetch live queue per station]
    S3 --> S4[4.4 Predict queue & wait time - ML]
    S4 --> S5[4.5 Normalize & weight 8 factors]
    S5 --> S6[4.6 Rank stations + generate explanations]
    S6 --> OUT["Ranked recommendation list"]

    S3 --> DSB[(Bookings, ChargingSessions)]
    S4 --> DSM[(Trained ML models)]
    S6 --> DSR[(RecommendationScores)]
```

---

## 8. Entity Relationship Diagram (summary)

```mermaid
erDiagram
    USERS ||--o{ VEHICLES : owns
    USERS ||--o{ BOOKINGS : makes
    USERS ||--o{ FEEDBACK : writes
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o| OPERATORS : "is (if operator)"
    OPERATORS ||--o{ CHARGING_STATIONS : manages
    CHARGING_STATIONS ||--o{ CHARGERS : has
    CHARGING_STATIONS ||--o{ BOOKINGS : "booked at"
    CHARGING_STATIONS ||--o{ ELECTRICITY_DEMAND : records
    CHARGING_STATIONS ||--o{ FEEDBACK : receives
    CHARGERS ||--o{ CHARGING_SESSIONS : hosts
    BOOKINGS ||--o| CHARGING_SESSIONS : "results in"
    BOOKINGS ||--o| PAYMENTS : "paid via"
    VEHICLES ||--o{ BOOKINGS : "used for"
```

For the full, versioned schema see [`database/schema.sql`](../database/schema.sql).
