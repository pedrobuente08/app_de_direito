/**
 * Migra `escritorio.config.login_map` → `usuario.login_aliases` e remove `login_map` do JSON.
 *
 *   cd apps/api && npx tsx src/db/scripts/migrar_login_aliases.ts
 *
 * Requer coluna `usuario.login_aliases` (patch SQL 004).
 */

import 'dotenv/config';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { normalizePostgresUrl } from '../database-url';
import { schema } from '../schema';
import { escritorio } from '../schema/escritorio';
import { usuario } from '../schema/usuario';

type ConfigJson = {
  login_map?: Record<string, string>;
  [k: string]: unknown;
};

function normalizarAliases(raw?: string[] | null): string[] {
  if (!raw?.length) {
    return [];
  }
  const visto = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    const u = x?.trim().toUpperCase();
    if (u && !visto.has(u)) {
      visto.add(u);
      out.push(u);
    }
  }
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL ausente');
  }

  const pool = new Pool({ connectionString: normalizePostgresUrl(url) });
  const db = drizzle(pool, { schema });

  const offices = await db
    .select({ id: escritorio.id, config: escritorio.config })
    .from(escritorio);

  let escritorios = 0;
  let aliasesAplicados = 0;

  for (const o of offices) {
    const cfg = (o.config ?? {}) as ConfigJson;
    const lm = cfg.login_map;
    if (!lm || typeof lm !== 'object') {
      continue;
    }

    escritorios += 1;

    for (const [aliasRaw, canonicalRaw] of Object.entries(lm)) {
      const alias = String(aliasRaw).trim().toUpperCase();
      const canonical = String(canonicalRaw).trim();
      if (!alias || !canonical) {
        continue;
      }

      const [u] = await db
        .select()
        .from(usuario)
        .where(
          and(
            eq(usuario.escritorioId, o.id),
            sql`lower(trim(coalesce(${usuario.nome}, ''))) = ${canonical.toLowerCase().trim()}`,
          ),
        )
        .limit(1);

      if (!u) {
        console.warn(
          `[migrar_login_aliases] Escritório ${o.id}: usuário não encontrado para nome "${canonical}" (alias "${alias}").`,
        );
        continue;
      }

      const merged = normalizarAliases([
        ...(u.loginAliases ?? []),
        alias,
      ]);

      await db
        .update(usuario)
        .set({ loginAliases: merged })
        .where(eq(usuario.id, u.id));
      aliasesAplicados += 1;
    }

    const { login_map: _drop, ...rest } = cfg;
    await db
      .update(escritorio)
      .set({ config: rest as object })
      .where(eq(escritorio.id, o.id));
  }

  await pool.end();
  console.info(
    `migrar_login_aliases: ${escritorios} escritório(s) com login_map; ${aliasesAplicados} alias(es) mesclado(s).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
