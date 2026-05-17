-- Campo de observações gerais do processo (briefing §2.1 — detalhe editável).
ALTER TABLE processo ADD COLUMN IF NOT EXISTS observacoes text;
