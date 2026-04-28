-- Content performance attribution table for C7 feedback loop

CREATE TABLE IF NOT EXISTS content_performance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  asset_type   TEXT NOT NULL,
  platform     TEXT,
  clicks       INTEGER NOT NULL DEFAULT 0,
  impressions  INTEGER NOT NULL DEFAULT 0,
  avg_position NUMERIC(6, 2),
  measured_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own performance data"
  ON content_performance
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role insert performance data"
  ON content_performance
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role update performance data"
  ON content_performance
  FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_content_performance_session_id
  ON content_performance(session_id);

CREATE INDEX IF NOT EXISTS idx_content_performance_measured_at
  ON content_performance(measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_performance_asset_type
  ON content_performance(asset_type, platform);
