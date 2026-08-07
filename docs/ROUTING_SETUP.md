# TZIR Self-Hosted Routing Stack — Setup & Remaining Steps

## What was implemented
- `utils/geocode_normalize.py` — `normalize_address()` + `normalize_address_key()` (handles Hebrew, street prefixes, city/country collisions).
- `utils/circuit_breaker.py` — self-contained `CircuitBreaker` (CLOSED/OPEN/HALF_OPEN) + `CircuitBreakerOpen`.
- `utils/geocoding.py` — `GeocodingService.geocode()`: DB cache -> Google (paid, primary) -> local Nominatim (free fallback).
- `utils/routing_client.py` — `fetch_distance_matrix()` with Redis pair-cache + Valhalla primary + Google emergency fallback via circuit breaker.
- `models.py` — `GeocodeCache` model (UNIQUE on normalized address + city + country_code, `expires_at` = +30 days).
- `routes/addresses.py` — `/geocode` endpoint now uses `GeocodingService` instead of direct Google/Nominatim calls.
- `infrastructure/routing/docker-compose.yml` — Valhalla (routing/matrix) + Nominatim (geocoding fallback) with healthchecks.

## Remaining steps (in order)

### 1. Create the geocode_cache table
With Docker stack up (postgres running):
```bash
cd backend
flask db migrate -m "add geocode_cache"
flask db upgrade
```
Or run the equivalent DDL manually against `tzir_delivery`.

### 2. Bring up the routing stack
```bash
docker compose -f infrastructure/routing/docker-compose.yml up -d
```
First Valhalla build of Israel tiles takes a few minutes (PBF ~150MB). Watch logs until `/status` returns OK.

### 3. Wire RouteOptimizer to the local engine
In `backend/utils/route_optimizer.py`, replace OSRM public URLs:
- `_fetch_distance_matrix()` -> call `utils.routing_client.fetch_distance_matrix(points, costing=...)`
- map `vehicle_type` to Valhalla costing via `COSTING_MAP` already defined in `routing_client.py`.

### 4. Scooter POC (mandatory before production)
Run `motor_scooter` costing with:
- `top_speed=50, use_primary=0.5` (default)
- `use_primary=0.0` (avoid highways)
- `top_speed=45`
Compare against real delivery times in DB. Pick the profile matching your fleet.

### 5. Monitoring dashboard
Add to `routes/stats.py`:
- Valhalla avg response time
- matrix cache hit-rate
- fallback-to-Google rate
Alert if avg matrix > 2s or cache-hit < 40%.

## Environment variables
- `VALHALLA_URL` (default http://localhost:8002)
- `NOMINATIM_URL` (default http://localhost:8080)
- `GOOGLE_MAPS_API_KEY` (used as primary geocoder + emergency matrix fallback)
- `REDIS_URL` (already used)
