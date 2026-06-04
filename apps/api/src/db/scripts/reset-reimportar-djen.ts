/**
 * Apaga processos/comunicações do escritório e dispara reimportação DJEN (365 dias).
 * Pré-requisito: API rodando (`npm run dev:api`) com código atual.
 *
 *   CONFIRM=APAGAR_PROCESSOS npm run db:reset-reimport-djen
 *
 * Variáveis: DJEN_DIAS=365 | ESCRITORIO_ID | OAB=66364/BA | API_BASE
 */
import 'dotenv/config';
import { Client } from 'pg';

const CONFIRM = process.env.CONFIRM?.trim();
const DIAS_JANELA = Math.min(
  365,
  Math.max(90, Number(process.env.DJEN_DIAS ?? 365) || 365),
);
const API_BASE = (
  process.env.API_BASE ?? `http://127.0.0.1:${process.env.PORT ?? 3001}/api`
).replace(/\/$/, '');
const EMAIL = process.env.SEED_EMAIL ?? 'admin@seed.conectar.local';
const SENHA = process.env.SEED_SENHA ?? 'SenhaTemp123!';

function parseOab(raw: string): { numero: string; uf: string } | null {
  const t = raw.trim().toUpperCase();
  let m = t.match(/^(\d+)[\/\-]([A-Z]{2})$/);
  if (m) return { numero: m[1]!, uf: m[2]! };
  m = t.match(/^([A-Z]{2})(\d+)$/);
  if (m) return { numero: m[2]!, uf: m[1]! };
  return null;
}

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, senha: SENHA }),
  });
  const body = (await res.json()) as { accessToken?: string; message?: string };
  if (!res.ok || !body.accessToken) {
    throw new Error(body.message ?? `Login falhou HTTP ${res.status}`);
  }
  return body.accessToken;
}

async function apagarDadosEscritorio(client: Client, escritorioId: string) {
  const count = async (sql: string) => {
    const r = await client.query(sql, [escritorioId]);
    return Number(r.rows[0]?.c ?? 0);
  };
  console.log('Antes:', {
    processos: await count(
      'SELECT count(*)::int AS c FROM processo WHERE escritorio_id = $1',
    ),
    comunicacoes: await count(
      'SELECT count(*)::int AS c FROM comunicacao WHERE escritorio_id = $1',
    ),
  });
  await client.query('BEGIN');
  try {
    await client.query(
      'UPDATE extracao_pendente SET processo_id = NULL WHERE escritorio_id = $1',
      [escritorioId],
    );
    await client.query('DELETE FROM pendencia WHERE escritorio_id = $1', [
      escritorioId,
    ]);
    await client.query('DELETE FROM audiencia WHERE escritorio_id = $1', [
      escritorioId,
    ]);
    await client.query('DELETE FROM comunicacao WHERE escritorio_id = $1', [
      escritorioId,
    ]);
    await client.query('DELETE FROM processo WHERE escritorio_id = $1', [
      escritorioId,
    ]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
  console.log('Depois:', {
    processos: await count(
      'SELECT count(*)::int AS c FROM processo WHERE escritorio_id = $1',
    ),
  });
}

async function aguardarOnboarding(token: string, maxMin = 120): Promise<void> {
  const deadline = Date.now() + maxMin * 60_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/onboarding/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const st = (await res.json()) as {
      status?: string;
      progresso?: { processado: number; total: number };
      relatorio?: unknown;
      erroMsg?: string;
    };
    if (!res.ok) throw new Error(`Status onboarding HTTP ${res.status}`);
    const { processado = 0, total = 0 } = st.progresso ?? {};
    const pct = total > 0 ? Math.round((processado / total) * 100) : 0;
    process.stdout.write(
      `\r[onboarding] ${st.status} ${processado}/${total} (${pct}%)   `,
    );
    if (st.status === 'DONE') {
      console.log('\nRelatório:', st.relatorio);
      return;
    }
    if (st.status === 'ERROR') {
      throw new Error(st.erroMsg ?? 'Onboarding falhou');
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Timeout após ${maxMin} min`);
}

async function main() {
  if (CONFIRM !== 'APAGAR_PROCESSOS') {
    console.error(
      '\n⚠️  CONFIRM=APAGAR_PROCESSOS npm run db:reset-reimport-djen\n',
    );
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL não definida');

  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();

  let escritorioId = process.env.ESCRITORIO_ID?.trim();
  if (!escritorioId) {
    const esc = await pg.query('SELECT id, nome FROM escritorio LIMIT 2');
    if (esc.rows.length !== 1) throw new Error('Defina ESCRITORIO_ID');
    escritorioId = esc.rows[0].id as string;
    console.log(`Escritório: ${esc.rows[0].nome}`);
  }

  let oabRaw = process.env.OAB?.trim();
  if (!oabRaw) {
    const oabs = await pg.query(
      'SELECT oab FROM oab_escuta WHERE escritorio_id = $1 ORDER BY created_at LIMIT 1',
      [escritorioId],
    );
    oabRaw = oabs.rows[0]?.oab as string | undefined;
  }
  const parsed = oabRaw ? parseOab(oabRaw) : null;
  if (!parsed) throw new Error('Cadastre OAB ou defina OAB=66364/BA');

  console.log(
    `\n=== Reset + DJEN ${DIAS_JANELA} dias (OAB ${parsed.numero}/${parsed.uf}) ===\n`,
  );

  await apagarDadosEscritorio(pg, escritorioId);
  await pg.end();

  const health = await fetch(`${API_BASE}/health`);
  if (!health.ok) {
    throw new Error(`API offline em ${API_BASE} — suba: npm run dev:api`);
  }

  const token = await login();
  const diasApi = DIAS_JANELA >= 330 ? 365 : DIAS_JANELA >= 150 ? 180 : 90;

  const start = await fetch(`${API_BASE}/onboarding/djen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      oab: parsed.numero,
      ufOab: parsed.uf,
      diasJanela: diasApi,
    }),
  });
  const startBody = (await start.json()) as { message?: string | string[] };
  if (!start.ok) {
    const msg = Array.isArray(startBody.message)
      ? startBody.message.join(' ')
      : startBody.message;
    throw new Error(msg ?? `Onboarding HTTP ${start.status}`);
  }

  console.log('Importação iniciada (pode levar 30–60 min)…\n');
  await aguardarOnboarding(token);

  const pg2 = new Client({ connectionString: dbUrl });
  await pg2.connect();
  const resumo = await pg2.query(
    `SELECT
       (SELECT count(*)::int FROM processo WHERE escritorio_id = $1) AS processos,
       (SELECT count(*)::int FROM comunicacao WHERE escritorio_id = $1) AS comunicacoes,
       (SELECT count(*)::int FROM audiencia WHERE escritorio_id = $1 AND data >= current_date) AS audiencias_futuras,
       (SELECT count(*)::int FROM processo WHERE escritorio_id = $1 AND cliente_nome IS NOT NULL AND trim(cliente_nome) <> '') AS com_cliente,
       (SELECT count(*)::int FROM processo WHERE escritorio_id = $1 AND reu_texto IS NOT NULL AND trim(reu_texto) <> '') AS com_reu,
       (SELECT count(*)::int FROM processo WHERE escritorio_id = $1 AND ultima_movimentacao_dt IS NOT NULL) AS com_ultima_mov`,
    [escritorioId],
  );
  console.log('\nResultado:', resumo.rows[0]);
  await pg2.end();
  console.log('\n✓ Concluído.\n');
}

main().catch((e) => {
  console.error('\n✗', (e as Error).message);
  process.exit(1);
});
