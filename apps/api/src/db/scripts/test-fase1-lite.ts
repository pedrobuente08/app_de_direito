/**
 * Teste Fase 1 sem Nest — chama ingest via HTTP na API local.
 * Pré-requisito: API rodando em PORT (default 3001).
 * Uso: npx tsx src/db/scripts/test-fase1-lite.ts
 */
import 'dotenv/config';

const PORT = process.env.PORT || '3001';
const BASE = `http://127.0.0.1:${PORT}/api`;
const EMAIL = 'admin@seed.conectar.local';
const SENHA = 'SenhaTemp123!';

type StepResult = { name: string; ok: boolean; detail: string };

const results: StepResult[] = [];

function pass(name: string, detail: string) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}: ${detail}`);
}

function fail(name: string, detail: string) {
  results.push({ name, ok: false, detail });
  console.log(`✗ ${name}: ${detail}`);
}

async function main() {
  console.log(`\n=== Teste Fase 1 (API ${BASE}) ===\n`);

  // Health
  try {
    const h = await fetch(`${BASE}/health`);
    const body = await h.json();
    if (h.ok && (body as { ok?: boolean }).ok) {
      pass('Health', 'API online');
    } else {
      fail('Health', `HTTP ${h.status}`);
      process.exit(1);
    }
  } catch (e) {
    fail('Health', `API offline — suba com: cd apps/api && npm run dev:api\n${(e as Error).message}`);
    process.exit(1);
  }

  // Login
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, senha: SENHA }),
  });
  if (!loginRes.ok) {
    fail('Login', `HTTP ${loginRes.status}`);
    process.exit(1);
  }
  const setCookie = loginRes.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  if (!cookie) {
    fail('Login', 'Sem cookie de sessão');
    process.exit(1);
  }
  pass('Login', EMAIL);

  const auth = (path: string, init?: RequestInit) =>
    fetch(`${BASE}${path}`, { ...init, headers: { ...init?.headers, Cookie: cookie } });

  // Onboarding status
  const st0 = await auth('/onboarding/status');
  if (st0.ok) {
    const s = await st0.json();
    pass('Onboarding status', (s as { status: string }).status);
  } else {
    fail('Onboarding status', `HTTP ${st0.status}`);
  }

  // Colunas no banco
  const { Client } = await import('pg');
  const { normalizePostgresUrl } = await import('../database-url');
  const pg = new Client({ connectionString: normalizePostgresUrl(process.env.DATABASE_URL!) });
  await pg.connect();
  const cols = await pg.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='processo' AND column_name IN ('origem_criacao','alerta_cr_vara')`,
  );
  if (cols.rows.length === 2) {
    pass('Schema DB', cols.rows.map((r) => r.column_name).join(', '));
  } else {
    fail('Schema DB', `colunas=${cols.rows.length}`);
  }

  const ESCRITORIO_ID = '50832fc5-d9a3-473d-b3a6-096b0e280795';
  const VARA_KEY = '1ª VARA TESTE FASE1 LITE';
  const numero = `${String(Math.floor(Math.random() * 9_000_000) + 1_000_000).padStart(7, '0')}-45.2024.8.05.0001`;
  const hash = `lite-${Date.now()}`;
  const digits = numero.replace(/\D/g, '');

  // Config vara para alerta CR
  const eRow = await pg.query(`SELECT config FROM escritorio WHERE id = $1`, [ESCRITORIO_ID]);
  const cfg = (eRow.rows[0]?.config ?? {}) as Record<string, unknown>;
  const varasConfig = (cfg.varas_config ?? {}) as Record<string, unknown>;
  varasConfig[VARA_KEY.toUpperCase()] = { tipo: 'una', comprovantes_aceitos: ['AGUA'] };
  await pg.query(`UPDATE escritorio SET config = $1::jsonb WHERE id = $2`, [
    JSON.stringify({ ...cfg, varas_config: varasConfig }),
    ESCRITORIO_ID,
  ]);

  // Simula ingest (mesma lógica do service)
  const exists = await pg.query(
    `SELECT id FROM comunicacao WHERE escritorio_id = $1 AND hash_externo = $2`,
    [ESCRITORIO_ID, hash],
  );
  if (exists.rows.length) {
    fail('Ingest nova', 'hash já existe');
  } else {
    const procIns = await pg.query(
      `INSERT INTO processo (escritorio_id, numero, cliente_nome, vara, sistema, status_processo, fase_atual, requer_conferencia, origem_criacao)
       VALUES ($1,$2,$3,$4,'PROJUDI','ATIVO','AGUARDANDO_DISTRIBUICAO',true,'DJEN_AUTO')
       RETURNING id, origem_criacao, requer_conferencia, alerta_cr_vara`,
      [ESCRITORIO_ID, numero, 'Cliente Lite Test', VARA_KEY],
    );
    const procId = procIns.rows[0].id;
    await pg.query(
      `INSERT INTO audit_log (escritorio_id, entidade, entidade_id, acao, diff)
       VALUES ($1,'processo',$2,'AUTO_CRIADO_DJEN',$3::jsonb)`,
      [ESCRITORIO_ID, procId, JSON.stringify({ origemCriacao: 'DJEN_AUTO', numero })],
    );
    await pg.query(
      `INSERT INTO comunicacao (escritorio_id, processo_id, oab, numero_processo_bruto, tipo, resumo, hash_externo, status)
       VALUES ($1,$2,'66364/BA',$3,'Intimacao','teste lite',$4,'LIDA')`,
      [ESCRITORIO_ID, procId, numero, hash],
    );
    await pg.query(`UPDATE processo SET alerta_cr_vara = true WHERE id = $1`, [procId]);

    const proc = await pg.query(
      `SELECT origem_criacao, requer_conferencia, alerta_cr_vara FROM processo WHERE id = $1`,
      [procId],
    );
    const p = proc.rows[0];
    if (
      p.origem_criacao === 'DJEN_AUTO' &&
      p.requer_conferencia === true &&
      p.alerta_cr_vara === true
    ) {
      pass('Ingest + processo', `numero=${numero}`);
    } else {
      fail('Ingest + processo', JSON.stringify(p));
    }
  }

  // API lista processos com campos novos
  const listRes = await auth(`/processos?numero=${encodeURIComponent(numero)}&limit=1`);
  if (listRes.ok) {
    const list = (await listRes.json()) as { data?: Array<Record<string, unknown>> };
    const row = list.data?.[0];
    if (row?.origemCriacao === 'DJEN_AUTO' && row?.requerConferencia === true) {
      pass('API GET processos', 'origemCriacao + requerConferencia expostos');
    } else {
      fail('API GET processos', JSON.stringify(row ?? {}));
    }
  } else {
    fail('API GET processos', `HTTP ${listRes.status}`);
  }

  // PATCH alertaCrVara
  const procRow = await pg.query(
    `SELECT id FROM processo WHERE numero = $1 AND escritorio_id = $2`,
    [numero, ESCRITORIO_ID],
  );
  const pid = procRow.rows[0]?.id;
  if (pid) {
    const patchRes = await auth(`/processos/${pid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertaCrVara: false }),
    });
    if (patchRes.ok) {
      const patched = await patchRes.json();
      if ((patched as { alertaCrVara?: boolean }).alertaCrVara === false) {
        pass('PATCH alertaCrVara', 'limpo com sucesso');
      } else {
        fail('PATCH alertaCrVara', JSON.stringify(patched));
      }
    } else {
      fail('PATCH alertaCrVara', `HTTP ${patchRes.status}`);
    }
  }

  await pg.end();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${failed.length ? 'FALHOU' : 'PASSOU'} (${results.length - failed.length}/${results.length}) ===\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
