-- Corrige status de comunicações existentes para refletir leitura pelo usuário,
-- não vinculação automática ao processo.
--
-- Antes: LIDA = "tem processo vinculado" (definido pela máquina)
-- Depois: LIDA = "usuário abriu e viu" (ação humana)
--
-- Regras:
--   LIDA   + processo vinculado  → NAO_LIDA  (sistema setou, usuário nunca abriu)
--   NAO_LIDA + sem processo      → ORFA      (deveria ter sido ORFA desde o início)

UPDATE comunicacao
SET status = 'NAO_LIDA'
WHERE status = 'LIDA'
  AND processo_id IS NOT NULL;

UPDATE comunicacao
SET status = 'ORFA'
WHERE status = 'NAO_LIDA'
  AND processo_id IS NULL;
