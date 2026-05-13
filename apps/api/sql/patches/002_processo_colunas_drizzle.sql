-- Colunas do `processo` alinhadas ao schema Drizzle atual (PLANO A3 / C1 e campos de auditoria).
-- Idempotente: ADD COLUMN IF NOT EXISTS (Postgres 11+; Supabase usa PG recente).
--
-- Usar depois de `001_processo_status_processo.sql` se ainda faltarem colunas.
-- SQL Editor do Supabase: colar e Run.

ALTER TABLE processo ADD COLUMN IF NOT EXISTS fase_atual varchar(50);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS qualidade_caso varchar(60);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS avaliacao_recurso jsonb;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS justica_gratuita boolean DEFAULT false;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS situacao_final varchar(50);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS telefone varchar(20);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS status_audiencia varchar(30);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS ultima_movimentacao_dt timestamptz;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS ultima_movimentacao_tipo varchar(50);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS requer_conferencia boolean DEFAULT false;

-- Garantir NOT NULL em requer_conferencia (como no Drizzle)
UPDATE processo SET requer_conferencia = false WHERE requer_conferencia IS NULL;
ALTER TABLE processo ALTER COLUMN requer_conferencia SET DEFAULT false;
ALTER TABLE processo ALTER COLUMN requer_conferencia SET NOT NULL;

ALTER TABLE processo ALTER COLUMN justica_gratuita SET DEFAULT false;
