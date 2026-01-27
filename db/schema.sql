-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    description TEXT,
    price NUMERIC,
    currency VARCHAR(10) DEFAULT 'ILS',
    start_date DATE,
    end_date DATE,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    original_url TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_ai_data JSONB
);

-- Index for faster geospatial queries if you add PostGIS later, 
-- or just general lookups
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_dates ON listings(start_date, end_date);
