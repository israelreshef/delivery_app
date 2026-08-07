-- Stage 1: Activate PostGIS spatial columns + indexes
-- Design decision (per architecture review):
--   * Trigger is THIN: only ST_SetSRID(ST_MakePoint(lng, lat), 4326).
--   * No reverse-geocoding / geofencing logic inside the trigger (avoid DB lock on batches).
--   * Applied to addresses + couriers (infrequent writes).
--   * Courier live-tracking position is updated in-app, NOT via trigger.

BEGIN;

-- Enable PostGIS extension (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Addresses: add geometry column
ALTER TABLE addresses
    ADD COLUMN IF NOT EXISTS location_geom geometry(Point, 4326);

-- 2. Couriers: add geometry column
ALTER TABLE couriers
    ADD COLUMN IF NOT EXISTS location_geom geometry(Point, 4326);

-- 3. Thin trigger function (NO extra logic)
CREATE OR REPLACE FUNCTION set_location_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location_geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach triggers (only for tables with lat/lng columns)
DROP TRIGGER IF EXISTS trg_addresses_geom ON addresses;
CREATE TRIGGER trg_addresses_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude
    ON addresses
    FOR EACH ROW EXECUTE FUNCTION set_location_geom();

DROP TRIGGER IF EXISTS trg_couriers_geom ON couriers;
CREATE TRIGGER trg_couriers_geom
    BEFORE INSERT OR UPDATE OF current_location_lat, current_location_lng
    ON couriers
    FOR EACH ROW EXECUTE FUNCTION set_location_geom();

-- 5. Backfill existing rows
UPDATE addresses
    SET location_geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location_geom IS NULL;

UPDATE couriers
    SET location_geom = ST_SetSRID(ST_MakePoint(current_location_lng, current_location_lat), 4326)
    WHERE current_location_lat IS NOT NULL AND current_location_lng IS NOT NULL AND location_geom IS NULL;

-- 6. Spatial indexes (GIST) for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_addresses_geom ON addresses USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS idx_couriers_geom ON couriers USING GIST (location_geom);

COMMIT;
