-- Fase 1 PLANO_PROXIMOS_PASSOS: auto-criar processo + alerta CR + onboarding
-- Aplicar manualmente no Supabase (não usar db:push destrutivo).

ALTER TABLE processo
  ADD COLUMN IF NOT EXISTS origem_criacao varchar(20) DEFAULT 'MANUAL';

ALTER TABLE processo
  ADD COLUMN IF NOT EXISTS alerta_cr_vara boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN processo.origem_criacao IS 'MANUAL | PDF | DJEN_AUTO | ONBOARDING';
COMMENT ON COLUMN processo.alerta_cr_vara IS 'Alerta visual: vara exige comprovante específico e CR ainda não informado';
