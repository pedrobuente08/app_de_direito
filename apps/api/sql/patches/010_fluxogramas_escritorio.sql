-- Sprint I — campos dos fluxogramas do escritório

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  hipossuficiencia_comprovada BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  vara_exige_doc_frequente BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE processo ADD COLUMN IF NOT EXISTS
  reu_orgao_publico BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE comarca ADD COLUMN IF NOT EXISTS
  exige_doc_frequente BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE sentenca ADD COLUMN IF NOT EXISTS
  turma_recursal SMALLINT;

ALTER TABLE sentenca ADD COLUMN IF NOT EXISTS
  tipo_decisao VARCHAR(20)
    CHECK (tipo_decisao IS NULL OR tipo_decisao IN ('MONOCRATICA', 'COLEGIADA'));

ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  tipo_execucao VARCHAR(20)
    CHECK (tipo_execucao IS NULL OR tipo_execucao IN ('COMUM', 'RPV', 'PRECATORIO'));

ALTER TABLE processo_procedente ADD COLUMN IF NOT EXISTS
  penhora_status VARCHAR(30)
    CHECK (penhora_status IS NULL OR penhora_status IN (
      'NAO_EXECUTADA',
      'SOLICITADA',
      'BLOQUEADA',
      'IMPUGNADA',
      'LIBERADA'
    ));

ALTER TABLE improcedente ADD COLUMN IF NOT EXISTS
  certidao_credito_solicitada BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE improcedente ADD COLUMN IF NOT EXISTS
  certidao_credito_data DATE;
