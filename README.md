# CareFlow Hub — SlopeGuard AI (Meghalaya Landslide Risk Monitor)

**"Predict Before the Slope Fails."**

Smart India Hackathon 2026 — problem statement **SIH26001**: AI-Based Early Warning and Landslide
Risk Monitoring System in the North Eastern Region.

A monitoring and early warning decision-support platform prototype developed for the SIH hackathon.

## Quick Start (Local Setup)

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Production build
npm run build

# 4. Preview production build
npm run preview
```

> **Honesty statement.** This is a **student research prototype**, not an official government
> warning system and not a live emergency monitoring service. Phase 1 delivers the interactive GIS
> foundation; Phase 2 adds a **transparent weighted risk engine** whose output is a
> *model-derived prototype risk score* for decision support. It is **not** a trained ML model, it
> does **not** predict whether or when a landslide will occur, and it makes no accuracy claim.
> Every value shown comes from the cited sources or from a clearly labelled demonstration input;
> where a factor is missing, the UI prints "Not available in prototype" instead of inventing a value.
> There is no alerting, notification or evacuation capability in this build.

---

## 1. What SLOPEGUARD AI is

A decision-support prototype for landslide risk monitoring. Phase 2 flow: the user picks a location
(map click, district or search) → the app collects the conditions that are actually available for
that point (demonstration or live rainfall, DEM-derived slope and relief, historical landslide
density from the official dataset) → a transparent weighted risk engine returns a 0–100
model-derived score, a LOW/MODERATE/HIGH/CRITICAL category, a plain-language "why", a factor
breakdown and a per-factor data-source status, and the score is drawn on the GIS map.

Phase 1 (still fully working) is an interactive map of
Meghalaya that shows official district boundaries and officially recorded landslide locations, with
searchable districts, toggleable layers, a legend and a details panel — usable on desktop and phones.

## 2. Why Meghalaya is the pilot

- Extremely high monsoon rainfall (Sohra/Mawsynram region) combined with steep slopes.
- Recurring landslides on NH-6 and other lifeline corridors.
- Meghalaya government publishes GIS services for district boundaries and landslide records, so the
  prototype can be built on real data rather than mock data.

## 3. Technologies used

| Layer      | Technology                                                          |
| ---------- | ------------------------------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite, Tailwind CSS v4                         |
| GIS        | Leaflet + React-Leaflet, OpenStreetMap basemap                      |
| Routing    | TanStack Router / TanStack Start (file-based routes)                |
| Data layer | TanStack Query + JSON/GeoJSON served by TypeScript server routes    |
| Icons      | lucide-react                                                        |

### Note on the backend

The original brief specified Python + FastAPI. This project runs as a single TypeScript full-stack
app (TanStack Start on Vite), which is the runtime available here, so the API is implemented as
TypeScript **server routes** with the same endpoints and the same separation of concerns
(`routers` → `src/routes/api/*`, `services` → `src/lib/gis-service.server.ts`, `data` →
`src/data/*.json`). Porting these four handlers to FastAPI later is mechanical: the GIS service is
pure data access with no UI coupling.

## 4. GIS architecture

```text
Meghalaya Government GIS (ArcGIS FeatureServer, not browser-accessible: CORS)
        │  one-off GeoJSON query + geometry simplification
        ▼
src/data/*.json                 source-derived static GeoJSON snapshots
        ▼
src/lib/gis-service.server.ts   server-only GIS service (joins, filters, counts)
        ▼
src/routes/api/*                HTTP API  (/api/health, /api/districts, …)
        ▼
src/services/gisApi.ts          typed client queries (TanStack Query, cached 1h)
        ▼
src/components/map/*            Leaflet rendering (client-only, canvas renderer)
```

- No GIS geometry is hardcoded in components.
- The map module is lazy-loaded in the browser only (Leaflet needs `window`).
- District boundaries are Douglas-Peucker simplified (~0.0025°) so the whole state loads fast on a
  student laptop; landslide points are drawn on a canvas renderer and co-located records are merged
  into one marker that reports how many records share those coordinates.

### API

| Endpoint                          | Returns                                                         |
| --------------------------------- | --------------------------------------------------------------- |
| `GET /api/health`                 | Service status and phase                                        |
| `GET /api/districts`              | 12 district polygons + area, bbox, landslide record count       |
| `GET /api/districts/{districtId}` | One district plus its landslide records                         |
| `GET /api/landslides`             | Landslide points; optional `?district=`, `?limit=`              |

## 5. Data sources

1. **Meghalaya Government GIS — District boundaries (2021)**
   `https://meghalayacmdashboard.in/gishosting/rest/services/Hosted/District_Boundary_2021/FeatureServer`
   12 district layers queried as GeoJSON (EPSG:4326) → `src/data/meghalaya-districts.json`.
2. **Meghalaya Government GIS — Landslide layer (MBDA)**
   `https://meghalayacmdashboard.in/gisserver/rest/services/MBDA_Test/Landslide/FeatureServer`
   1,733 statewide landslide point records with district, location, year, event date, casualties,
   highway affected, reporting source → `src/data/meghalaya-landslides.json`.
3. **GSI Bhusanket landslide susceptibility** — `https://bhusanket.gsi.gov.in/` — referenced for
   Phase 2 susceptibility classes. **Not consumed in Phase 1**; the UI therefore reports
   susceptibility as unavailable rather than guessing.
4. **Basemaps** — OpenStreetMap (default), OpenTopoMap (terrain), Esri World Imagery (satellite).
5. **Place search** — OpenStreetMap Nominatim (free, optional; the app works without it).

Both Meghalaya services are labelled in the UI as **source-derived static data** because they were
queried once and stored, not polled live.

## 6. How to run

```bash
npm install
npm run dev          # http://localhost:8080
```

Health check: `curl http://localhost:8080/api/health`

No environment variables are required for Phase 1.

## 7. Refreshing / adding GIS data

Snapshots were produced by an ArcGIS GeoJSON query per layer (`?where=1=1&outFields=*&f=geojson&outSR=4326`,
paginated at 1,000 features) followed by geometry simplification. To add a future layer:

1. Save the GeoJSON as `src/data/<layer>.json`.
2. Expose it through `src/lib/gis-service.server.ts` and a new `src/routes/api/<layer>.ts`.
3. Add a typed query in `src/services/gisApi.ts` and a `LayerState` key.
4. Render it inside `src/components/map/MeghalayaMap.tsx` and list it in `LayerPanel`.

## 8. Risk intelligence engine (Phase 2)

### Model

`src/lib/risk/risk-model.ts` implements the `RiskModel` interface (so a trained `MLRiskModel` can
replace it later without touching routes or UI). The active model is `WeightedRiskModel`, id
`prototype_weighted_risk_model`:

```text
score = 100 × Σ(weightᵢ × normalisedFactorᵢ) / Σ(weightᵢ of available factors)
```

Weights and all limits live in one editable file, `src/lib/risk/risk-config.json`:

| Factor              | Weight | Normalisation (0 → 1)              | Source                                        |
| ------------------- | ------ | ---------------------------------- | --------------------------------------------- |
| Rainfall (24 h)     | 0.35   | 0 → 250 mm                         | Demonstration scenario **or** live Open-Meteo |
| Slope               | 0.30   | 1° → 15° average gradient          | Open-Meteo Elevation (Copernicus DEM GLO-90)  |
| Historical activity | 0.20   | 0 → 40 records within 10 km        | Meghalaya GIS landslide dataset               |
| Terrain relief      | 0.15   | 30 → 300 m local relief            | DEM-derived proxy, labelled *prototype value* |

Missing factors are dropped and the remaining weights are re-normalised; the UI states which factors
were unavailable.

### Prototype categories (not official thresholds)

`0–24 LOW · 25–49 MODERATE · 50–74 HIGH · 75–100 CRITICAL` — chosen for this prototype only. They
are not Government of India, NDMA or GSI thresholds.

### Endpoints

| Endpoint                  | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `POST /api/risk/predict`  | `{ latitude, longitude, rainfall?, slope?, scenario?, useLiveWeather?, includeForecast? }` → score, level, factors, explanation, data status, model metadata |
| `GET /api/risk/grid`      | ~199 0.1° cells clipped to district polygons, each scored by the same engine |
| `GET /api/risk/weather`   | Live observed/forecast precipitation availability for a point            |

Invalid coordinates or negative rainfall return HTTP 400. Every prediction is logged server-side
(inputs, score, model id, timing) without personal data.

### Reproducible demo (East Khasi Hills, 25.57, 91.88)

| Scenario           | Score | Level    |
| ------------------ | ----- | -------- |
| Normal 40 mm       | 46    | MODERATE |
| Heavy rain 120 mm  | 66    | HIGH     |
| Extreme rain 200 mm| 87    | CRITICAL |

Same location + same rainfall ⇒ same score (static factors are cached, never randomised).

### Tests

```bash
npx vitest run          # 16 unit tests (risk engine + response rules)
```

They cover model identity, low/high/extreme scenarios, monotonic rainfall response, 0–100 bounds,
factor re-weighting when data is missing, explanation generation, the configured weight total, and
the Phase 3 recommended-response rules (alert eligibility, distinct categories, exposure and
field-report notes, disclaimers, determinism).

## 8b. Decision support and early warning (Phase 3)

The workflow is one connected system: **select location → map → assess risk → understand why →
identify affected infrastructure → field verification → demonstration alert → recommended action →
authority response (acknowledge / resolve)**.

### Infrastructure exposure (real data only)

`src/lib/decision/proximity.server.ts` queries the **OpenStreetMap Overpass API** live for roads,
bridges, settlements, schools and hospitals/clinics around the assessed point, and reports the
straight-line distance to each. If the public query fails, the UI shows
`Asset data unavailable in prototype.` — no substitute or invented assets are ever displayed.
Exposure means "mapped assets are near this location"; it is **not** a damage prediction.

### Recommended response (transparent rules, not ML)

| Model-derived level | Category | Alert eligible |
| --- | --- | --- |
| LOW | NO ALERT — routine monitoring | no |
| MODERATE | MONITOR | no |
| HIGH | WARNING — increased monitoring, inspect exposed infrastructure | yes |
| CRITICAL | URGENT — field verification and local emergency preparedness | yes |

Rules live in `src/lib/decision/recommendation.ts`. They are prototype decision-support rules, not
official government protocol.

### Demonstration alerts

Alerts are records stored in the app's own database only. **No SMS, email, push notification or
authority/agency message is ever sent, and the prototype has no evacuation authority.** Each alert
stores location, district, model score/level, the reasons from the risk engine, the exposure summary
and the rainfall scenario, plus status (`active` → `acknowledged` → `resolved`). No personal
information is stored.

### Field / citizen verification

Reports capture location, observation type, description and an optional photo/video (max 8 MB, kept
in private storage and served through short-lived signed URLs). Reports are **evidence only and never
change the model-derived risk score**; they appear on the map and beside the assessment for a human
to judge. Written reports made offline are queued in the browser and submitted on reconnect (media is
not queued). No name, phone number or other personal data is collected.

### Phase 3 endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/infrastructure/nearby?lat&lon&radius` | Live OSM assets near a point |
| `GET /api/alerts` · `GET /api/alerts/active` | Alert dashboard / history |
| `POST /api/alerts` | Create a demonstration alert (HIGH / CRITICAL only) |
| `GET /api/alerts/:id` | Full alert detail |
| `POST /api/alerts/:id/acknowledge` · `/resolve` | Authority response states |
| `GET /api/reports` · `POST /api/reports` | Field reports (multipart for media) |
| `GET /api/reports/:id` · `POST /api/reports/:id/status` | Report detail / verification state |
| `POST /api/demo/run` | Deterministic Shillong demo (25.57, 91.88, 200 mm, 3 km) |

`POST /api/demo/run` always runs the same inputs, so the same model-derived score is produced,
real nearby assets are checked, and a demonstration alert is created when the level is alert-eligible.
All write endpoints validate input with Zod and reject invalid values with HTTP 400.

## 9. Implemented now (Phase 1)

- Interactive Meghalaya map, OSM basemap, terrain and satellite basemap options.
- 12 official district boundaries with labels, click selection, highlight and zoom-to-district.
- 1,733 official landslide records with click popups and a full details panel (source fields only).
- District search + optional OpenStreetMap place search; district dropdown; "My location".
- Layer toggles (with Phase 2 layers clearly disabled), legend with an inactive Phase 2 risk key.
- Mobile layout: full-screen map, bottom tab bar (Layers / Legend / Details) opening a sheet.
- Graceful failure: "GIS data temporarily unavailable." — never substituted with fake data.
- API layer with health, districts, district detail and landslide endpoints.

## 10. Not in this build

Real notification delivery (SMS / email / push / authority systems), evacuation or resource routing,
official warning authority, computer-vision crack screening, GSI susceptibility class ingestion, and
any trained machine-learning model.

## 12. Known limitations

- District areas are computed from **simplified** boundaries, so they are approximate and labelled
  "derived".
- The upstream services are not queried live (CORS + service limits); snapshots must be refreshed
  manually.
- The source dataset repeats coordinates for recurring events; such records are merged into one
  marker with a record count.
- District names in the landslide dataset have inconsistent capitalisation; matching is
  case-insensitive.
- Landslide susceptibility class per district is not available in this build; a DEM-derived relief
  proxy is used and labelled as a prototype value.
- The risk grid applies **one** rainfall value across all cells for a scenario — it is a scenario
  map, not a live statewide rainfall map.
- Live rainfall (Open-Meteo) is optional and off by default; the slider is labelled "Demonstration
  rainfall scenario" and is never described as live.
- The DEM service rate-limits requests; when a sample fails the slope/terrain factors are reported
  as unavailable rather than estimated.
- Nearby-asset counts come from volunteer-maintained OpenStreetMap data and are incomplete in rural
  Meghalaya; missing assets are not evidence of absence.
- The public Overpass service rate-limits requests; when every mirror refuses, exposure is reported
  as unavailable instead of estimated.
- Alerts and field reports are prototype records inside this app. Nothing is delivered to any
  authority, phone or emergency service, and report verification states are set by demo users.
