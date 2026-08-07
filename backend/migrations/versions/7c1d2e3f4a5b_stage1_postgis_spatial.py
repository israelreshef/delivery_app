"""stage 1: activate postgis spatial columns + indexes

Revision ID: 7c1d2e3f4a5b
Revises: bd88f9ba02d9
Create Date: 2026-07-17 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7c1d2e3f4a5b'
down_revision = 'bd88f9ba02d9'
branch_labels = None
depends_on = None

STAGE1_SQL = """
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE addresses
    ADD COLUMN IF NOT EXISTS location_geom geometry(Point, 4326);

ALTER TABLE couriers
    ADD COLUMN IF NOT EXISTS location_geom geometry(Point, 4326);

CREATE OR REPLACE FUNCTION set_location_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location_geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

UPDATE addresses
    SET location_geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location_geom IS NULL;

UPDATE couriers
    SET location_geom = ST_SetSRID(ST_MakePoint(current_location_lng, current_location_lat), 4326)
    WHERE current_location_lat IS NOT NULL AND current_location_lng IS NOT NULL AND location_geom IS NULL;

CREATE INDEX IF NOT EXISTS idx_addresses_geom ON addresses USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS idx_couriers_geom ON couriers USING GIST (location_geom);
"""


def upgrade():
    op.execute(STAGE1_SQL)


def downgrade():
    op.execute("""
        DROP TRIGGER IF EXISTS trg_addresses_geom ON addresses;
        DROP TRIGGER IF EXISTS trg_couriers_geom ON couriers;
        DROP FUNCTION IF EXISTS set_location_geom();
        ALTER TABLE addresses DROP COLUMN IF EXISTS location_geom;
        ALTER TABLE couriers DROP COLUMN IF EXISTS location_geom;
    """)
