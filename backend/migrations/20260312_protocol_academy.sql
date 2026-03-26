-- Migration script for Customer App and Protocol System
-- Date: 2026-03-12

-- 1. Protocol Templates
CREATE TABLE IF NOT EXISTS delivery_protocol_templates (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(1) UNIQUE NOT NULL,  -- 'A', 'B', 'C', 'D'
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    steps           JSONB NOT NULL  -- ordered list of step definitions
);

-- 2. Delivery Protocol Configs
CREATE TABLE IF NOT EXISTS delivery_protocol_configs (
    id                        SERIAL PRIMARY KEY,
    name                      VARCHAR(100) NOT NULL,
    slug                      VARCHAR(100) UNIQUE NOT NULL,
    category                  VARCHAR(50) NOT NULL,
    base_protocol             VARCHAR(1) REFERENCES delivery_protocol_templates(code),
    requires_id_verification  BOOLEAN DEFAULT FALSE,
    requires_photo            BOOLEAN DEFAULT TRUE,
    requires_signature        BOOLEAN DEFAULT TRUE,
    requires_otp              BOOLEAN DEFAULT FALSE,
    otp_alternatives          JSONB,
    max_attempts              INTEGER DEFAULT 1,
    return_document_required  BOOLEAN DEFAULT FALSE,
    multi_stop_allowed        BOOLEAN DEFAULT FALSE,
    chain_of_custody          BOOLEAN DEFAULT FALSE,
    pricing_tier              INTEGER DEFAULT 1,
    pricing_multiplier        DECIMAL(4,2) DEFAULT 1.0,
    is_active                 BOOLEAN DEFAULT TRUE,
    created_at                TIMESTAMP DEFAULT NOW()
);

-- 3. Academy Protocol Courses
CREATE TABLE IF NOT EXISTS academy_protocol_courses (
    id                  SERIAL PRIMARY KEY,
    protocol_slug       VARCHAR(100) REFERENCES delivery_protocol_configs(slug),
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    estimated_minutes   INTEGER DEFAULT 15,
    passing_score       INTEGER DEFAULT 80,
    required_level      INTEGER DEFAULT 1,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- 4. Academy Protocol Lessons
CREATE TABLE IF NOT EXISTS academy_protocol_lessons (
    id          SERIAL PRIMARY KEY,
    course_id   INTEGER REFERENCES academy_protocol_courses(id),
    order_index INTEGER NOT NULL,
    title       VARCHAR(200) NOT NULL,
    content     TEXT NOT NULL,
    lesson_type VARCHAR(50),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 5. Academy Protocol Progress
CREATE TABLE IF NOT EXISTS academy_protocol_progress (
    id              SERIAL PRIMARY KEY,
    courier_id      INTEGER REFERENCES couriers(id),
    course_id       INTEGER REFERENCES academy_protocol_courses(id),
    status          VARCHAR(20) DEFAULT 'not_started',
    score           INTEGER,
    attempts        INTEGER DEFAULT 0,
    completed_at    TIMESTAMP,
    UNIQUE(courier_id, course_id)
);

-- 6. Update Deliveries Table
-- Adding protocol_slug for reference
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='protocol_slug') THEN
        ALTER TABLE deliveries ADD COLUMN protocol_slug VARCHAR(100) REFERENCES delivery_protocol_configs(slug);
    END IF;
END $$;
