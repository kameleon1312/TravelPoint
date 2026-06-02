-- Sprint 1: performance indexes + push notification token field

-- Bounding-box geo query index — speeds up nearby spots lookup
CREATE INDEX IF NOT EXISTS "Spot_lat_lng_idx" ON "Spot"("lat", "lng");

-- DM thread query index — speeds up bidirectional conversation lookup
CREATE INDEX IF NOT EXISTS "Transmission_senderId_recipientId_idx"
  ON "Transmission"("senderId", "recipientId");

-- Push notification token — stored per explorer for Expo Push API
ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "pushToken" TEXT;
