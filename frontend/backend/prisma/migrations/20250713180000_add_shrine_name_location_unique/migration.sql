-- Add unique constraint to Shrine (name, location)
ALTER TABLE "Shrine" ADD CONSTRAINT "Shrine_name_location_key" UNIQUE ("name", "location"); 