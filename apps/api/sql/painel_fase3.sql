-- Fase 3: Dashboard / Jurimetria básica (aditivo)

CREATE MATERIALIZED VIEW IF NOT EXISTS mat_taxa_exito AS
SELECT
  p.escritorio_id,
  ROUND(
    COUNT(*) FILTER (
      WHERE COALESCE(ult.resultado, '') IN ('PROCEDENTE', 'PARCIAL', 'ACORDO')
    ) * 100.0 / NULLIF(COUNT(*), 0),
    1
  ) AS pct_procedentes,
  COUNT(*)::int AS total_com_sentenca
FROM processo p
INNER JOIN LATERAL (
  SELECT s.resultado
  FROM sentenca s
  WHERE s.processo_id = p.id
  ORDER BY s.data DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1
) ult ON true
GROUP BY p.escritorio_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mat_taxa_exito_esc
  ON mat_taxa_exito (escritorio_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS mat_tempo_sentenca AS
SELECT
  p.escritorio_id,
  COALESCE(NULLIF(TRIM(p.vara), ''), '(sem vara)') AS vara,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM AGE(s.data, p.data_distribuicao)) / (86400.0 * 30.44)
    )::numeric,
    1
  ) AS avg_meses,
  COUNT(*)::int AS amostra
FROM sentenca s
INNER JOIN processo p ON s.processo_id = p.id
WHERE p.data_distribuicao IS NOT NULL
  AND s.grau = 'PRIMEIRO_GRAU'
GROUP BY p.escritorio_id, COALESCE(NULLIF(TRIM(p.vara), ''), '(sem vara)');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mat_tempo_sentenca_uniq
  ON mat_tempo_sentenca (escritorio_id, vara);

-- Primeira carga (views recém-criadas)
REFRESH MATERIALIZED VIEW mat_taxa_exito;
REFRESH MATERIALIZED VIEW mat_tempo_sentenca;
