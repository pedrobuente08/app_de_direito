-- Pós-audiência: campos adicionais para presença do réu e histórico recuperável (desfazer finalização)

-- 1) audiencia: presença do réu
ALTER TABLE audiencia ADD COLUMN IF NOT EXISTS
  reu_presenca VARCHAR(10);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audiencia_reu_presenca_check'
  ) THEN
    ALTER TABLE audiencia ADD CONSTRAINT audiencia_reu_presenca_check
      CHECK (reu_presenca IS NULL OR reu_presenca IN ('PRESENTE', 'AUSENTE'));
  END IF;
END $$;

-- 2) audiencia_historico: replicar campos para permitir "desfazer finalização"
ALTER TABLE audiencia_historico ADD COLUMN IF NOT EXISTS
  autor_presenca VARCHAR(10);
ALTER TABLE audiencia_historico ADD COLUMN IF NOT EXISTS
  reu_presenca VARCHAR(10);
ALTER TABLE audiencia_historico ADD COLUMN IF NOT EXISTS
  motivo_ausencia TEXT;
ALTER TABLE audiencia_historico ADD COLUMN IF NOT EXISTS
  cenario VARCHAR(30);
ALTER TABLE audiencia_historico ADD COLUMN IF NOT EXISTS
  cenario_observacao TEXT;
ALTER TABLE audiencia_historico ADD COLUMN IF NOT EXISTS
  escritorio_adversario_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audiencia_historico_reu_presenca_check'
  ) THEN
    ALTER TABLE audiencia_historico ADD CONSTRAINT audiencia_historico_reu_presenca_check
      CHECK (reu_presenca IS NULL OR reu_presenca IN ('PRESENTE', 'AUSENTE'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audiencia_historico_autor_presenca_check'
  ) THEN
    ALTER TABLE audiencia_historico ADD CONSTRAINT audiencia_historico_autor_presenca_check
      CHECK (autor_presenca IS NULL OR autor_presenca IN ('PRESENTE', 'AUSENTE'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audiencia_historico_cenario_check'
  ) THEN
    ALTER TABLE audiencia_historico ADD CONSTRAINT audiencia_historico_cenario_check
      CHECK (cenario IS NULL OR cenario IN (
        'REVELIA',
        'TODOS_COMPARECERAM',
        'SO_ADVOGADO',
        'UNA',
        'FRACIONADA',
        'DOCUMENTACAO_PENDENTE'
      ));
  END IF;
END $$;
