-- Advogado (ou outro perfil) que também conduz audiências como pautista.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS eh_pautista BOOLEAN NOT NULL DEFAULT false;

UPDATE usuario SET eh_pautista = true WHERE perfil = 'pautista';
