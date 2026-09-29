# SlopeGuard AI — Meghalaya Landslide Risk Monitor

**"Predict Before the Slope Fails."**

**Smart India Hackathon 2026** — Problem Statement **SIH26001**: AI-Based Early Warning and Landslide Risk Monitoring System in the North Eastern Region.

Public Repository: [https://github.com/shaik-irfa/slopegaurd_Ai](https://github.com/shaik-irfa/slopegaurd_Ai)

---

## 1. Project Overview

**SlopeGuard AI** is a GIS-based early warning and decision-support prototype designed to monitor landslide risks across the state of Meghalaya in North East India. Meghalaya experiences some of the highest monsoon rainfall in the world (e.g., Cherrapunji / Mawsynram) coupled with steep terrain, leading to frequent landslides along vital lifelines such as NH-6.

SlopeGuard AI combines official Meghalaya GIS datasets, real-time rainfall data/scenarios, digital elevation model (DEM) slope analysis, historical landslide incident density, and critical infrastructure proximity (schools, hospitals, villages, roads, bridges) to produce transparent, model-derived risk assessments and actionable response recommendations.

> **Honesty & Prototype Statement:** This is a student research decision-support prototype developed for SIH 2026. It uses a transparent weighted rule-based risk engine to calculate 0–100 risk scores with full factor breakdowns. It is designed to assist planners and field officers and does not issue official government evacuation mandates.

---

## 2. Problem Statement

* **Context:** The North Eastern Region of India, particularly Meghalaya, suffers severe landslide occurrences during monsoon seasons, cutting off remote communities, blocking national highways, and endangering lives and critical infrastructure.
* **Challenges:**
  1. Lack of unified, accessible spatial decision-support tools integrating terrain, rainfall, and historical records.
  2. Need for transparent, explainable risk calculations rather than uninterpretable black-box models.
  3. Lack of rapid local infrastructure exposure assessment (roads, hospitals, schools, bridges).
  4. Need for citizen and field verification reporting that works even in low-connectivity rural areas.

---

## 3. Implemented Solution & Key Features

1. **Interactive GIS Map Dashboard:**
   * High-performance canvas-rendered Leaflet map covering all 12 Meghalaya districts.
   * Visualisation of 1,733 officially recorded landslide points merged and clustered for high performance.
   * District boundary polygons with bounding box zooming and real-time spatial filtering.
   * Toggleable GIS layers: District Boundaries, Historical Landslides, Risk Grid Cells, Topographic Terrain, Satellite Imagery, Critical Assets, and Citizen Reports.

2. **Transparent Weighted Risk Engine:**
   * Multi-factor scoring model combining:
     * **Rainfall Factor (40%):** Live Open-Meteo precipitation or scenario slider (Normal / High / Extreme monsoon conditions).
     * **Slope & Relief Proxy (25%):** Terrain incline and elevation gradient.
     * **Historical Landslide Density (25%):** Spatial proximity and incident recurrence within the official MBDA dataset.
     * **Infrastructure Exposure (10%):** Proximity to roads, settlements, schools, and hospitals.
   * Generates clear risk tiers: `LOW (0-39)`, `MODERATE (40-69)`, `HIGH (70-84)`, and `CRITICAL (85-100)` with plain-language factor breakdown.

3. **Critical Infrastructure Exposure Analysis:**
   * Live OpenStreetMap Overpass spatial queries for mapped assets within 1 km to 5 km of any assessed coordinate.
   * Immediate identification of vulnerable lifelines (National Highways, primary roads, village settlements, healthcare facilities, bridges).

4. **Early Warning & Response Recommendations:**
   * Rule-based response guidance corresponding to risk severity:
     * *Low:* Routine monitoring.
     * *Moderate:* Increased surveillance.
     * *High:* Warning — inspect exposed infrastructure lifelines.
     * *Critical:* Urgent — initiate local emergency preparedness and field inspection.
   * Demonstration alert generation (`/alerts`) with full audit history and status tracking (`active` → `acknowledged` → `resolved`).

5. **Field & Citizen Verification Reports (`/reports`):**
   * Interface for ground personnel and citizens to submit geolocated observation reports (crack formation, soil erosion, debris on road, blocked culverts).
   * Offline report queue in browser localStorage for automatic synchronization when connectivity is restored.

---

## 4. System Architecture & Technology Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        SlopeGuard AI Architecture                       │
└────────────────────────────────────────────────────────────────────────┘
                                   │
       ┌───────────────────────────┴───────────────────────────┐
       ▼                                                       ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│       Frontend Client         │               │     Backend Server Routes     │
│  - React 19, TypeScript       │  HTTP / JSON  │  - TanStack Start & Nitro     │
│  - Vite & Tailwind CSS v4     │ ◄───────────► │  - GIS Service (src/lib/gis)  │
│  - TanStack Router & Query    │               │  - Risk Engine (src/lib/risk) │
│  - Leaflet / React-Leaflet    │               │  - Decision API (/api/*)      │
│  - Radix UI & Lucide Icons    │               │  - Supabase PostgreSQL Client │
└───────────────────────────────┘               └───────────────────────────────┘
               │                                               │
               ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     Client-Side Storage       │               │      External Data Sources    │
│  - Offline Report Queue       │               │  - Meghalaya Govt GIS GeoJSON │
│  - Leaflet Tile Cache         │               │  - Open-Meteo Weather API     │
│  - TanStack Query Cache (1h)  │               │  - OpenStreetMap Overpass API │
└───────────────────────────────┘               └───────────────────────────────┘
```

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript | Modern, high-performance user interface |
| **Build & Styling** | Vite 8, Tailwind CSS v4 | Fast HMR and utility-first CSS |
| **Routing & SSR** | TanStack Router, TanStack Start | Type-safe file-based routing and fullstack runtime |
| **State & Data Fetching**| TanStack Query v5 | Server state caching, deduplication, and background sync |
| **GIS Mapping** | Leaflet 1.9, React-Leaflet 5 | Interactive map rendering with canvas layer acceleration |
| **UI Components** | Radix UI Primitives, Lucide Icons | Accessible headless components and iconography |
| **Backend API** | TypeScript Server Routes (Nitro) | Server-side endpoints for GIS queries, risk scoring, alerts |
| **Database** | Supabase (PostgreSQL) | Managed cloud database with local fallback for alert records |
| **External APIs** | Open-Meteo, OSM Overpass | Live rainfall data and spatial asset extraction |

---

## 5. Project Structure

```text
slopeguard-ai/
├── public/                     # Static web assets (favicon, robots.txt)
├── src/
│   ├── components/
│   │   ├── decision/           # Alert cards, recommended actions, exposure panel
│   │   ├── details/            # District and incident detail panels
│   │   ├── layers/             # Layer selector and GIS map legends
│   │   ├── layout/             # Navigation header, mobile tabs, regional summary
│   │   ├── map/                # Leaflet map container and polygon/marker renderers
│   │   ├── reports/            # Citizen & field verification form and list
│   │   ├── risk/               # Risk cards, rainfall scenario slider, factor breakdown
│   │   ├── search/             # District and coordinate search bar
│   │   └── ui/                 # Reusable Radix UI components (dialog, sheet, button, etc.)
│   ├── data/
│   │   ├── meghalaya-districts.json   # 12 official district polygons (GeoJSON)
│   │   └── meghalaya-landslides.json  # 1,733 historical landslide records (GeoJSON)
│   ├── hooks/                  # Custom hooks (mobile detection, offline report queue)
│   ├── integrations/
│   │   └── supabase/           # Supabase client, auth helpers, and database types
│   ├── lib/
│   │   ├── decision/           # Response recommendation rules, alert service, schemas
│   │   ├── geo.ts              # Spatial math (haversine distance, bounding box)
│   │   ├── gis-service.server.ts # Server-side GIS queries, spatial joins, filtering
│   │   └── risk/               # Transparent weighted risk model & weather service
│   ├── routes/
│   │   ├── __root.tsx          # Root application shell, stylesheet, meta tags
│   │   ├── index.tsx           # Main GIS map & risk intelligence dashboard
│   │   ├── alerts.index.tsx    # Alerts monitoring dashboard
│   │   ├── alerts.$alertId.tsx # Detailed alert view & response action state
│   │   ├── reports.tsx         # Field verification reports dashboard
│   │   └── api/                # TypeScript server endpoints (/health, /districts, /risk, etc.)
│   ├── services/               # Typed client-side API connectors (gisApi, riskApi, decisionApi)
│   ├── styles.css              # Tailwind CSS v4 design tokens and custom animations
│   ├── router.tsx              # TanStack router configuration
│   ├── server.ts               # SSR entry point and error wrapper
│   └── start.ts                # TanStack Start initialization & middleware
├── supabase/
│   ├── config.toml             # Supabase project configuration
│   └── migrations/             # SQL migrations for alerts and reports tables
├── docs/                       # Project documentation artifacts (PDF)
├── .env.example                # Environment variables template
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler options
└── vite.config.ts              # Vite & TanStack Start build configuration
```

---

## 6. Local Setup & Installation

### Prerequisites
* **Node.js**: `v20.x` or `v24.x` (verified on Node `v24.14.1`)
* **npm**: `v10.x` or `v11.x` (verified on npm `11.11.0`)

### Installation Commands

```bash
# 1. Clone repository
git clone https://github.com/shaik-irfa/slopegaurd_Ai.git
cd slopegaurd_Ai

# 2. Install dependencies
npm install

# 3. Configure environment variables (Optional: safe local defaults are included)
cp .env.example .env

# 4. Start local development server
npm run dev
```

The application will start on **`http://localhost:8080/`**.

### Production Build & Preview

```bash
# Build the production application bundle
npm run build

# Preview the production build locally
npm run preview
```

---

## 7. Environment Variables

The application runs standalone with built-in GIS snapshots and local storage fallbacks. To connect to an external Supabase database instance, configure the following variables in `.env`:

| Variable Name | Description | Default / Format |
| :--- | :--- | :--- |
| `SUPABASE_PROJECT_ID` | Supabase Project Identifier | String |
| `SUPABASE_PUBLISHABLE_KEY` | Public Supabase API Key | String |
| `SUPABASE_URL` | Supabase Project Endpoint | `https://<project-id>.supabase.co` |
| `VITE_SUPABASE_PROJECT_ID` | Client-exposed Project ID | String |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client-exposed Public Key | String |
| `VITE_SUPABASE_URL` | Client-exposed Endpoint | `https://<project-id>.supabase.co` |

*(See `.env.example` for template configuration)*

---

## 8. Verified Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check, service status, and active prototype phase |
| `/api/districts` | `GET` | 12 Meghalaya district boundaries with polygon GeoJSON |
| `/api/districts/:districtId` | `GET` | Single district metadata, bounding box, and incident records |
| `/api/landslides` | `GET` | 1,733 statewide historical landslide coordinates with filters |
| `/api/risk/predict` | `POST` | Calculate transparent risk score for coordinates & rainfall |
| `/api/risk/grid` | `GET` | Statewide risk grid computation for current rainfall scenario |
| `/api/infrastructure/nearby` | `GET` | Overpass query for nearby roads, schools, hospitals, bridges |
| `/api/alerts` | `GET`, `POST` | Query active demonstration alerts or generate a new alert |
| `/api/reports` | `GET`, `POST` | Retrieve citizen reports or submit a new field report |

---

## 9. Testing & Quality Assurance

* **Application Startup:** Verified on Node.js / Vite development server on port 8080.
* **Frontend GIS Rendering:** Verified complete rendering of 12 district polygons and 1,733 landslide markers.
* **End-to-End Smoke Test:** Verified full interaction cycle:
  1. District selection and map panning.
  2. Dynamic rainfall scenario slider adjustments.
  3. Real-time recalculation of risk scores and factor breakdown.
  4. Routing and navigation across `/`, `/alerts`, and `/reports`.
  5. Offline report persistence and data verification.
* **Production Build:** `npm run build` executed and verified with zero compilation errors.

---

## 10. Future Roadmap

1. **Machine Learning Model Integration:** Train high-resolution susceptibility models using multi-spectral satellite imagery (Sentinel-2 / SAR) and geological soil data.
2. **Automated Authority Alerting:** Integration with NDMA / SDMA CAP (Common Alerting Protocol) for SMS and broadcast warnings.
3. **IoT Sensor Ingestion:** Live telemetry from ground pore pressure sensors and inclinometers installed on vulnerable highway corridors.
4. **Offline Mobile PWA:** Progressive Web App with vector tile pre-caching for fully offline disaster field response.

---

## 11. GitHub Repository

* **Repository:** [https://github.com/shaik-irfa/slopegaurd_Ai](https://github.com/shaik-irfa/slopegaurd_Ai)
* **Branch:** `main`
* **Licence:** MIT Open Source (Student Research Prototype)
