-- Patch 003 — tabelas e colunas do PLANO_AJUSTES ainda ausentes na base (Supabase legada).
-- Rode no SQL Editor do Supabase DEPOIS de 001 e 002 (processo).
-- Idempotente: CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
--
-- Se gen_random_uuid() der erro, execute antes:
--   CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Escritório adversário (antes da FK em audiencia) ───────────────────────
CREATE TABLE IF NOT EXISTS escritorio_adversario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  nome_canonico varchar(300) NOT NULL,
  cnpj varchar(18),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escritorio_id, nome_canonico)
);

CREATE TABLE IF NOT EXISTS escritorio_adversario_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_adversario_id uuid NOT NULL REFERENCES escritorio_adversario (id) ON DELETE CASCADE,
  alias varchar(300) NOT NULL
);

-- ─── Sentenças (1º / 2º grau) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentenca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES processo (id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  grau varchar(20) NOT NULL,
  data date NOT NULL,
  valor numeric(12, 2),
  resultado varchar(40) NOT NULL,
  favoravel_para varchar(10) NOT NULL,
  turma varchar(50),
  assessor_julgador varchar(100),
  turno_julgamento varchar(20),
  observacoes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentenca_processo ON sentenca (processo_id);
CREATE INDEX IF NOT EXISTS idx_sentenca_escritorio ON sentenca (escritorio_id, data);

-- ─── Improcedentes / sucumbência ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS improcedente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES processo (id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  valor_sucumbencia numeric(12, 2),
  destinatario_sucumbencia varchar(300),
  status_pagamento varchar(30) NOT NULL DEFAULT 'A_PAGAR',
  data_prazo_pagamento date,
  data_pagamento date,
  decisao_recurso varchar(20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Histórico de fase (E3) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fase_historico (
  id serial PRIMARY KEY,
  processo_id uuid NOT NULL REFERENCES processo (id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  fase_anterior varchar(50),
  fase_nova varchar(50) NOT NULL,
  origem varchar(20) NOT NULL,
  usuario_id uuid REFERENCES usuario (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fase_historico_processo ON fase_historico (processo_id);

-- ─── Audiência ausente (E7) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audiencia_ausente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  audiencia_id uuid REFERENCES audiencia (id) ON DELETE SET NULL,
  processo_id uuid NOT NULL REFERENCES processo (id) ON DELETE CASCADE,
  numero_processo varchar(30) NOT NULL,
  cliente_nome varchar(300),
  reu_id uuid,
  materia varchar(100),
  vara varchar(50),
  qualidade_caso varchar(60),
  data_audiencia date NOT NULL,
  motivo_ausencia text NOT NULL,
  reaproveitavel boolean,
  reaproveitado_em date,
  observacoes_revisao text,
  created_at timestamptz DEFAULT now()
);

-- ─── Colunas em audiencia (C2) ──────────────────────────────────────────────
ALTER TABLE audiencia ADD COLUMN IF NOT EXISTS escritorio_adversario_id uuid REFERENCES escritorio_adversario (id) ON DELETE SET NULL;
ALTER TABLE audiencia ADD COLUMN IF NOT EXISTS autor_presenca varchar(10);
ALTER TABLE audiencia ADD COLUMN IF NOT EXISTS motivo_ausencia text;

-- ─── Colunas em processo_procedente (se a tabela já existir sem elas) ───────
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS recurso_tipo varchar(20);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS recurso_origem varchar(10);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS recurso_resultado varchar(20);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS doc_pendente jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ─── Transições do funil procedente ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedente_transicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES processo (id) ON DELETE CASCADE,
  escritorio_id uuid NOT NULL REFERENCES escritorio (id) ON DELETE CASCADE,
  situacao_anterior varchar(60),
  situacao_nova varchar(60) NOT NULL,
  origem varchar(20) NOT NULL,
  usuario_id uuid REFERENCES usuario (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Pendência: origem (C3) ─────────────────────────────────────────────────
ALTER TABLE pendencia ADD COLUMN IF NOT EXISTS origem varchar(20) NOT NULL DEFAULT 'MANUAL_INTIMACOES';
