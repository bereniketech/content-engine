-- =====================================================================
-- FX Rates Table — Externalize Currency Conversion Rates
-- Generated: 20260428000010
-- =====================================================================

CREATE TABLE fx_rates (
  id SERIAL PRIMARY KEY,
  currency VARCHAR(3) UNIQUE NOT NULL,
  rate DECIMAL(10, 4) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fx_rates_currency ON fx_rates(currency);

-- Initial seed data with base rates
INSERT INTO fx_rates (currency, rate, updated_at) VALUES
  ('USD', 1.0, NOW()),
  ('INR', 83.0, NOW()),
  ('EUR', 0.92, NOW())
ON CONFLICT (currency) DO UPDATE SET
  rate = EXCLUDED.rate,
  updated_at = NOW();
