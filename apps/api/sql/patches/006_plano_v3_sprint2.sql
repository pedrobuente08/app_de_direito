-- Patch 006 — PLANO V3 Sprint 2: campos em processo/tabelas existentes + tabelas novas.
-- Idempotente. Rodar após 001–005.

-- ─── processo: campos V3 ─────────────────────────────────────────────────────
ALTER TABLE processo ADD COLUMN IF NOT EXISTS tipo_cr varchar(50);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS data_transito date;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS sucumbencia_devida boolean DEFAULT false;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS honorario_sucumbencial_valor varchar(30);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS honorario_sucumbencial_status varchar(20);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS honorario_sucumbencial_pago_em date;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS justica_gratuita_concedida_em date;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS justica_gratuita_expira_em date;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS justica_gratuita_revisada_em date;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS sobrestamento_motivo text;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS sobrestado_desde date;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS recurso_adversario boolean DEFAULT false;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS parceiro_escritorio varchar(200);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS observacao_geral text;

UPDATE processo SET observacao_geral = observacoes
WHERE observacao_geral IS NULL AND observacoes IS NOT NULL;

-- ─── sentenca: extinção ──────────────────────────────────────────────────────
ALTER TABLE sentenca ADD COLUMN IF NOT EXISTS extincao_modalidade varchar(20);
ALTER TABLE sentenca ADD COLUMN IF NOT EXISTS motivo_extincao varchar(100);

-- ─── pendencia: fila e resultado ───────────────────────────────────────────
ALTER TABLE pendencia ADD COLUMN IF NOT EXISTS fila varchar(30);
ALTER TABLE pendencia ADD COLUMN IF NOT EXISTS resultado varchar(30);

-- ─── audiencia: advogado adversário ─────────────────────────────────────────
ALTER TABLE audiencia ADD COLUMN IF NOT EXISTS advogado_adversario_id uuid;

-- ─── processo_procedente: execução ─────────────────────────────────────────
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS data_protocolo_alvara date;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS data_alvara_expedido date;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS data_peticao_cumprimento date;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS data_penhora_realizada date;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS valor_penhorado numeric(12, 2);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS penhora_origem varchar(50);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS observacoes_execucao text;

-- ─── advogado_adversario ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advogado_adversario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  escritorio_adversario_id uuid REFERENCES escritorio_adversario (id) ON DELETE SET NULL,
  nome_canonico varchar(300) NOT NULL,
  oab varchar(20),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escritorio_id, nome_canonico)
);

CREATE TABLE IF NOT EXISTS advogado_adversario_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advogado_adversario_id uuid NOT NULL REFERENCES advogado_adversario (id) ON DELETE CASCADE,
  alias varchar(300) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audiencia_advogado_adversario_id_fkey'
  ) THEN
    ALTER TABLE audiencia
      ADD CONSTRAINT audiencia_advogado_adversario_id_fkey
      FOREIGN KEY (advogado_adversario_id) REFERENCES advogado_adversario (id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── vara_documento_regra ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vara_documento_regra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  vara varchar(50) NOT NULL,
  tipo_documento varchar(50),
  formato_documento varchar(50),
  aceita boolean NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vara_doc_regra_escritorio ON vara_documento_regra (escritorio_id, vara);

-- ─── processo_reprotocolo (1:1) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processo_reprotocolo (
  processo_id uuid PRIMARY KEY REFERENCES processo (id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  sub_estado varchar(50),
  motivo_extincao varchar(100),
  modalidade_extincao varchar(20),
  data_extincao date,
  data_isencao_pedida date,
  data_isencao_resultado varchar(20),
  data_reprotocolo date,
  processo_novo_id uuid REFERENCES processo (id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── notificacao ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuario (id) ON DELETE SET NULL,
  fila varchar(30),
  tipo_gatilho varchar(50),
  entidade varchar(50),
  entidade_id uuid,
  canal varchar(20),
  prioridade varchar(10),
  conteudo jsonb,
  lida_em timestamptz,
  agendada_para timestamptz,
  enviada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacao_escritorio ON notificacao (escritorio_id, created_at DESC);

-- ─── feriado ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feriado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  data date NOT NULL,
  descricao varchar(100),
  tipo varchar(20),
  UNIQUE (escritorio_id, data)
);
