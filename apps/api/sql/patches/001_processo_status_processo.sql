-- Garante a coluna `processo.status_processo` esperada pelo Drizzle (PLANO_AJUSTES A3).
-- Se depois aparecer erro de outras colunas em `processo`, rode também `002_processo_colunas_drizzle.sql`.
-- Erro típico sem este passo: column "status_processo" does not exist
--
-- Aplicar uma vez no Postgres do ambiente, por exemplo:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/sql/patches/001_processo_status_processo.sql
--
-- Comportamento:
-- 1) Se `status_processo` já existir → não faz nada.
-- 2) Se existir `situacao` (legado) → renomeia para `status_processo`.
-- 3) Caso contrário → cria `status_processo` NOT NULL DEFAULT 'ATIVO'.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'processo'
      AND column_name = 'status_processo'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'processo'
      AND column_name = 'situacao'
  ) THEN
    ALTER TABLE processo RENAME COLUMN situacao TO status_processo;
  ELSE
    ALTER TABLE processo
      ADD COLUMN status_processo varchar(20) NOT NULL DEFAULT 'ATIVO';
  END IF;
END
$$;

-- Valores fora do conjunto ATIVO | SOBRESTADO | ARQUIVADO → ATIVO (alinhado ao backend)
UPDATE processo
SET status_processo = 'ATIVO'
WHERE status_processo IS NULL
   OR btrim(status_processo) = '';

UPDATE processo
SET status_processo = upper(btrim(status_processo))
WHERE status_processo IS NOT NULL;

UPDATE processo
SET status_processo = 'ATIVO'
WHERE status_processo NOT IN ('ATIVO', 'SOBRESTADO', 'ARQUIVADO');

ALTER TABLE processo
  ALTER COLUMN status_processo SET DEFAULT 'ATIVO';

ALTER TABLE processo
  ALTER COLUMN status_processo SET NOT NULL;
