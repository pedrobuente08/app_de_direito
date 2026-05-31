-- Fase 1: AI Gateway + Billing (aditivo — sem DROP/truncate)

CREATE TABLE IF NOT EXISTS ai_usage (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES usuario(id) ON DELETE SET NULL,
  feature           text NOT NULL,
  provider          text NOT NULL DEFAULT 'anthropic',
  model             text NOT NULL,
  input_tokens      int NOT NULL,
  output_tokens     int NOT NULL,
  cache_read_tokens int NOT NULL DEFAULT 0,
  cache_write_tokens int NOT NULL DEFAULT 0,
  custo_brl         numeric(10,6) NOT NULL,
  creditos          int NOT NULL,
  cache_hit         boolean NOT NULL DEFAULT false,
  latency_ms        int,
  processo_id       uuid REFERENCES processo(id) ON DELETE SET NULL,
  conversa_id       uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_quota (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  periodo         text NOT NULL,
  plano           text NOT NULL,
  creditos_total  int NOT NULL,
  creditos_usados int NOT NULL DEFAULT 0,
  overage_policy  text NOT NULL DEFAULT 'block',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_registry (
  model               text PRIMARY KEY,
  provider            text NOT NULL,
  input_price_usd     numeric(12,8) NOT NULL,
  output_price_usd    numeric(12,8) NOT NULL,
  cache_read_discount numeric(4,3) NOT NULL DEFAULT 0.1,
  active              boolean NOT NULL DEFAULT true,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_created
  ON ai_usage (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_feature
  ON ai_usage (tenant_id, feature, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_quota_tenant_periodo
  ON ai_quota (tenant_id, periodo);

-- Preços default (USD por 1k tokens)
INSERT INTO model_registry (model, provider, input_price_usd, output_price_usd, cache_read_discount)
VALUES
  ('claude-3-5-haiku-latest', 'anthropic', 0.00080000, 0.00400000, 0.100),
  ('claude-sonnet-4-20250514', 'anthropic', 0.00300000, 0.01500000, 0.100)
ON CONFLICT (model) DO NOTHING;
