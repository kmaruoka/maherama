-- Test PostGIS functions directly
SELECT
  s.id,
  s.name,
  s.lat,
  s.lng,
  ST_Distance(
    ST_MakePoint(s.lng, s.lat)::geography,
    ST_MakePoint(135.49644470214847, 34.694555809205376)::geography
  ) as distance
FROM "Shrine" s
WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
ORDER BY distance
LIMIT 5;

