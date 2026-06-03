-- Fase 3 PRO — SQL aditivo (aplicar manualmente no Supabase)
-- Add-ons: recursos_avancados, workflows_raros, captacao, execucao_avancada, justica_comum_pje

-- [8.1] Embargos de declaração
CREATE TABLE IF NOT EXISTS embargos_declaracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentenca_id UUID NOT NULL REFERENCES sentenca(id) ON DELETE CASCADE,
  processo_id UUID NOT NULL REFERENCES processo(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  origem VARCHAR(10) NOT NULL CHECK (origem IN ('NOS', 'REU', 'AMBOS')),
  data_interposicao DATE NOT NULL,
  prazo_julgamento DATE,
  resultado VARCHAR(30) CHECK (
    resultado IS NULL OR resultado IN (
      'ACOLHIDOS', 'PARCIALMENTE_ACOLHIDOS', 'REJEITADOS', 'A_JULGAR'
    )
  ),
  data_julgamento DATE,
  observacoes TEXT,
  interrompe_prazo_recurso BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_embargos_processo ON embargos_declaracao (escritorio_id, processo_id);

-- [9.1] Tutela antecipada
CREATE TABLE IF NOT EXISTS tutela_antecipada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processo(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('TUTELA_ANTECIPADA', 'TUTELA_CAUTELAR', 'LIMINAR')),
  pedido_em DATE NOT NULL,
  resultado VARCHAR(30) CHECK (resultado IN ('DEFERIDA', 'INDEFERIDA', 'PARCIALMENTE_DEFERIDA', 'REVOGADA', 'PENDENTE')),
  data_resultado DATE,
  prazo_cumprimento DATE,
  cumprida BOOLEAN NOT NULL DEFAULT false,
  cumprida_em DATE,
  descricao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tutela_processo ON tutela_antecipada (escritorio_id, processo_id);

-- [9.2] Sucessores (autor falecido)
CREATE TABLE IF NOT EXISTS processo_sucessor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processo(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  nome VARCHAR(300) NOT NULL,
  cpf VARCHAR(14),
  parentesco VARCHAR(50),
  habilitado BOOLEAN NOT NULL DEFAULT false,
  habilitado_em DATE,
  documentos_recebidos JSONB NOT NULL DEFAULT '[]',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sucessor_processo ON processo_sucessor (escritorio_id, processo_id);

-- [9.3] Sobrestamento detalhado em processo
ALTER TABLE processo ADD COLUMN IF NOT EXISTS sobrestamento_motivo_codigo VARCHAR(40);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS sobrestamento_tema_afetado VARCHAR(100);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS sobrestamento_previsao_retorno DATE;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS sobrestamento_revisado_em DATE;

-- [10] Parceiros e captação
CREATE TABLE IF NOT EXISTS parceiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('PF', 'ESCRITORIO')),
  cpf_cnpj VARCHAR(18),
  comissao_percentual NUMERIC(5,2),
  cor_hex VARCHAR(7),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (escritorio_id, nome)
);

CREATE TABLE IF NOT EXISTS parceiro_materia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  parceiro_id UUID NOT NULL REFERENCES parceiro(id) ON DELETE CASCADE,
  materia VARCHAR(100) NOT NULL,
  UNIQUE (escritorio_id, materia)
);

ALTER TABLE processo ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES parceiro(id);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS comissao_calculada NUMERIC(12,2);
ALTER TABLE processo ADD COLUMN IF NOT EXISTS comissao_paga BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE processo ADD COLUMN IF NOT EXISTS comissao_paga_em DATE;

-- [11] Execução avançada
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS astreintes_ativa BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS astreintes_valor_diario NUMERIC(12,2);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS astreintes_data_inicio DATE;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS astreintes_total_acumulado NUMERIC(14,2);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS astreintes_ultima_atualizacao DATE;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS astreintes_teto NUMERIC(14,2);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS astreintes_suspensa_em DATE;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS astreintes_paga_em DATE;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS penhora_sistema VARCHAR(20);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS sisbajud_numero_ordem VARCHAR(50);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS sisbajud_data_bloqueio DATE;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS sisbajud_valor_bloqueado NUMERIC(12,2);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS bacenjud_data_oficio DATE;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS bacenjud_banco_alvo VARCHAR(100);

-- [12] PJE — produção probatória e execução órgão público
CREATE TABLE IF NOT EXISTS processo_producao_probatoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processo(id) ON DELETE CASCADE,
  escritorio_id UUID NOT NULL REFERENCES escritorio(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL CHECK (tipo IN (
    'PERICIA', 'QUESITOS', 'ASSISTENTE_TECNICO',
    'CONTADORIA_JUDICIAL', 'PROVA_DOCUMENTAL', 'AUDIENCIA_INSTRUCAO'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'AGUARDANDO',
  data_designacao DATE,
  data_conclusao DATE,
  perito_nome VARCHAR(200),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_producao_probatoria ON processo_producao_probatoria (escritorio_id, processo_id);

ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS execucao_contra_orgao_publico BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS modalidade_execucao_pub VARCHAR(20);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS numero_rpv VARCHAR(50);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS numero_precatorio VARCHAR(50);
ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS previsao_pagamento_pub DATE;
