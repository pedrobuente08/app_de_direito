-- Fase 2: Captura DJEN ativa (aditivo — sem DROP/truncate)
CREATE TABLE IF NOT EXISTS capturas_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  oab           varchar(20) NOT NULL,
  fonte         varchar(20) NOT NULL,
  iniciado_em   timestamptz NOT NULL,
  concluido_em  timestamptz,
  status        varchar(20) NOT NULL,
  total_items   int DEFAULT 0,
  novos_items   int DEFAULT 0,
  erro_msg      text
);

CREATE TABLE IF NOT EXISTS fontes_saude (
  fonte                 varchar(20) NOT NULL,
  escritorio_id         uuid NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  ultimo_ok_em          timestamptz,
  ultima_falha_em       timestamptz,
  falhas_consecutivas   int NOT NULL DEFAULT 0,
  PRIMARY KEY (fonte, escritorio_id)
);

ALTER TABLE comunicacao ADD COLUMN IF NOT EXISTS hash_externo varchar(64);

CREATE INDEX IF NOT EXISTS idx_comunicacao_hash_externo
  ON comunicacao (escritorio_id, hash_externo)
  WHERE hash_externo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_capturas_log_escritorio
  ON capturas_log (escritorio_id, iniciado_em DESC);
