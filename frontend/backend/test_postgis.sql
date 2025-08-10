-- Test PostGIS performance
EXPLAIN ANALYZE
SELECT
  s.id,
  s.name,
  ST_Distance(
    ST_MakePoint(s.lng, s.lat)::geography,
    ST_MakePoint(135.491724, 34.691803)::geography
  ) as distance
FROM "Shrine" s
WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
ORDER BY distance
LIMIT 5;

