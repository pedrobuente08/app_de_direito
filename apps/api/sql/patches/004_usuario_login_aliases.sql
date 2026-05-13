-- Aliases de login no nome do arquivo → advogado (skill). Ver PLANO_DERIVACAO_E_SEMAFORO §1.1
ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS login_aliases text[] NOT NULL DEFAULT '{}';
