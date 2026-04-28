-- Task 022: Add partial index on user_devices.fingerprint_hash
-- Purpose: Improve query performance for device fingerprint lookups during signup anti-abuse checks
-- This partial index only covers recent (24h) device records, which is what checkDeviceFingerprint() cares about.
-- Smaller index = faster, less disk space.

CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint_hash
  ON public.user_devices(fingerprint_hash)
  WHERE created_at > NOW() - INTERVAL '24 hours';
