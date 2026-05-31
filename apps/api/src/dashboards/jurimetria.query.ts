import { sql } from 'drizzle-orm';
import type { DrizzleService } from '../db/drizzle.service';

export type TempoSentencaRow = {
  vara: string;
  avgMeses: number;
  amostra: number;
};

export type TaxaExitoRow = {
  pctProcedentes: number;
  totalComSentenca: number;
};

/** Tempo médio até sentença (1º grau) por vara — lê mat_tempo_sentenca ou calcula inline. */
export async function queryTempoSentencaPorVara(
  drizzle: DrizzleService,
  escritorioId: string,
  limit = 6,
): Promise<TempoSentencaRow[]> {
  try {
    const res = await drizzle.db.execute(sql`
      SELECT vara, avg_meses::float8 AS avg_meses, amostra::int AS amostra
      FROM mat_tempo_sentenca
      WHERE escritorio_id = ${escritorioId}::uuid
        AND amostra >= 1
      ORDER BY amostra DESC, avg_meses DESC
      LIMIT ${limit}
    `);
    return (res.rows as { vara: string; avg_meses: number; amostra: number }[]).map(
      (r) => ({
        vara: r.vara,
        avgMeses: Number(r.avg_meses ?? 0),
        amostra: Number(r.amostra ?? 0),
      }),
    );
  } catch {
    const res = await drizzle.db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(p.vara), ''), '(sem vara)') AS vara,
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM AGE(s.data, p.data_distribuicao)) / (86400.0 * 30.44)
          )::numeric,
          1
        )::float8 AS avg_meses,
        COUNT(*)::int AS amostra
      FROM sentenca s
      INNER JOIN processo p ON s.processo_id = p.id
      WHERE p.escritorio_id = ${escritorioId}::uuid
        AND p.data_distribuicao IS NOT NULL
        AND s.grau = 'PRIMEIRO_GRAU'
      GROUP BY COALESCE(NULLIF(TRIM(p.vara), ''), '(sem vara)')
      HAVING COUNT(*) >= 1
      ORDER BY COUNT(*) DESC
      LIMIT ${limit}
    `);
    return (res.rows as { vara: string; avg_meses: number; amostra: number }[]).map(
      (r) => ({
        vara: r.vara,
        avgMeses: Number(r.avg_meses ?? 0),
        amostra: Number(r.amostra ?? 0),
      }),
    );
  }
}

/** Taxa de êxito do escritório — mat_taxa_exito ou cálculo inline. */
export async function queryTaxaExito(
  drizzle: DrizzleService,
  escritorioId: string,
): Promise<TaxaExitoRow | null> {
  try {
    const res = await drizzle.db.execute(sql`
      SELECT pct_procedentes::float8 AS pct, total_com_sentenca::int AS total
      FROM mat_taxa_exito
      WHERE escritorio_id = ${escritorioId}::uuid
      LIMIT 1
    `);
    const row = res.rows[0] as { pct: number; total: number } | undefined;
    if (!row) return null;
    return {
      pctProcedentes: Number(row.pct ?? 0),
      totalComSentenca: Number(row.total ?? 0),
    };
  } catch {
    const res = await drizzle.db.execute(sql`
      SELECT
        ROUND(
          COUNT(*) FILTER (
            WHERE COALESCE(ult.resultado, '') IN ('PROCEDENTE', 'PARCIAL', 'ACORDO')
          ) * 100.0 / NULLIF(COUNT(*), 0),
          1
        )::float8 AS pct,
        COUNT(*)::int AS total
      FROM processo p
      INNER JOIN LATERAL (
        SELECT s.resultado
        FROM sentenca s
        WHERE s.processo_id = p.id
        ORDER BY s.data DESC NULLS LAST, s.created_at DESC NULLS LAST
        LIMIT 1
      ) ult ON true
      WHERE p.escritorio_id = ${escritorioId}::uuid
    `);
    const row = res.rows[0] as { pct: number; total: number } | undefined;
    if (!row || Number(row.total) === 0) return null;
    return {
      pctProcedentes: Number(row.pct ?? 0),
      totalComSentenca: Number(row.total ?? 0),
    };
  }
}

/** Média geral de meses até sentença (todas as varas do escritório). */
export async function queryTempoSentencaMedioEscritorio(
  drizzle: DrizzleService,
  escritorioId: string,
): Promise<number | null> {
  const rows = await queryTempoSentencaPorVara(drizzle, escritorioId, 100);
  if (!rows.length) return null;
  const totalAmostra = rows.reduce((s, r) => s + r.amostra, 0);
  if (totalAmostra === 0) return null;
  const weighted =
    rows.reduce((s, r) => s + r.avgMeses * r.amostra, 0) / totalAmostra;
  return Math.round(weighted * 10) / 10;
}

/** Benchmark por vara = média ponderada de todas as varas (proxy até DataJud). */
export function mediaBenchmarkVaras(rows: TempoSentencaRow[]): number {
  if (!rows.length) return 0;
  const total = rows.reduce((s, r) => s + r.amostra, 0);
  if (total === 0) return 0;
  return (
    Math.round(
      (rows.reduce((s, r) => s + r.avgMeses * r.amostra, 0) / total) * 10,
    ) / 10
  );
}
