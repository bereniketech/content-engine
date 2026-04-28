CREATE TABLE IF NOT EXISTS public.generation_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id),
  action_type      TEXT        NOT NULL,
  model_used       TEXT        NOT NULL,
  prompt_tokens    INT         NOT NULL DEFAULT 0,
  completion_tokens INT        NOT NULL DEFAULT 0,
  latency_ms       INT         NOT NULL,
  status           TEXT        NOT NULL,
  request_id       UUID        NOT NULL UNIQUE,
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gen_log_user ON public.generation_log (user_id, created_at DESC);
