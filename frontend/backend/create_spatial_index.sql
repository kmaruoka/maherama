-- Create spatial index for Shrine table
CREATE INDEX IF NOT EXISTS idx_shrine_location ON "Shrine" USING GIST (ST_MakePoint(lng, lat));

-- Verify the index was created
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Shrine';

