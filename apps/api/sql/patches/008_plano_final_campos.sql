-- Sprint B (PLANO_FINAL): campos aditivos em processo, comarca, audiencia, processo_procedente

-- processo
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  fase_updated_at TIMESTAMPTZ;

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  revelia_decretada BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  litigancia_ma_fe BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_emitido BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_valor NUMERIC(12,2);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_data_emissao DATE;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_status VARCHAR(30);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_data_pedido_isencao DATE;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  daje_data_pagamento DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'processo_daje_status_check'
  ) THEN
    ALTER TABLE processo ADD CONSTRAINT processo_daje_status_check
      CHECK (daje_status IS NULL OR daje_status IN (
        'EMITIDO',
        'ISENCAO_PEDIDA',
        'ISENCAO_DEFERIDA',
        'ISENCAO_INDEFERIDA',
        'PAGO',
        'DIVIDA_ATIVA',
        'ARQUIVADO_SEM_PAGAMENTO'
      ));
  END IF;
END $$;

-- comarca
ALTER TABLE comarca ADD COLUMN IF NOT EXISTS
  perfil_diligencia VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comarca_perfil_diligencia_check'
  ) THEN
    ALTER TABLE comarca ADD CONSTRAINT comarca_perfil_diligencia_check
      CHECK (perfil_diligencia IS NULL OR perfil_diligencia IN ('DILIGENTE', 'MENOS_DILIGENTE'));
  END IF;
END $$;

-- audiencia
ALTER TABLE audiencia ADD COLUMN IF NOT EXISTS
  cenario VARCHAR(30);
ALTER TABLE audiencia ADD COLUMN IF NOT EXISTS
  cenario_observacao TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audiencia_cenario_check'
  ) THEN
    ALTER TABLE audiencia ADD CONSTRAINT audiencia_cenario_check
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

-- processo_procedente
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  tem_obrigacao_fazer BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  obrigacao_fazer_descricao TEXT;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  obrigacao_fazer_cumprida BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  obrigacao_fazer_cumprida_em DATE;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  serasajud_acionado BOOLEAN NOT NULL DEFAULT false;
