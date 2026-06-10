/**
 * Importa processos e comunicações DJEN direto do banco, sem precisar da API rodando.
 *
 *   npm run db:importar-djen -w api
 *
 * Variáveis opcionais:
 *   DJEN_DIAS=365       janela em dias (padrão: 365)
 *   OAB=66364/BA        força OAB; se omitido usa oab_escuta do escritório
 *   ESCRITORIO_ID=...   força escritório; se omitido usa o único cadastrado
 */

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

// ─── Configuração ──────────────────────────────────────────────────────────────

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1';
const DIAS_JANELA = Math.min(365, Math.max(7, Number(process.env.DJEN_DIAS ?? 365) || 365));
const MIN_DIGITOS = 20;

// ─── Helpers de data ───────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function hojeYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function ymdFromDisponibilizacao(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// ─── Parsers (replicados de comunicacoes.service.ts) ───────────────────────────

function normTipo(s: string): string {
  return s.toUpperCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function formatNumeroCnj(digits: string): string {
  if (digits.length !== 20) return digits;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

function normalizarNumero(bruto: string | undefined, digits: string): string {
  const masc = bruto?.trim();
  if (masc && masc.replace(/\D/g, '').length >= MIN_DIGITOS) return masc.slice(0, 30);
  return formatNumeroCnj(digits).slice(0, 30);
}

function inferirSistema(tribunal: string, orgao: string): string {
  const t = tribunal.toUpperCase();
  const o = orgao.toUpperCase();
  if (t.includes('PJE') || o.includes('PJE')) return 'PJE_TJBA';
  return 'PROJUDI';
}

function plainTexto(html: string | null | undefined): string {
  if (!html?.trim()) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extrairAutorDoTexto(texto: string | null | undefined): string | null {
  const plain = plainTexto(texto);
  if (!plain) return null;
  const patterns = [
    /\b(?:autor(?:a)?|requerente|promovente)[:\s\-–]+([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ\s\.\-'"]{4,120})/i,
    /\b([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ\s\.\-'"]{4,80})\s+x\s+[A-ZÁÉÍÓÚÃÕÂÊÔÇ]/,
  ];
  for (const re of patterns) {
    const m = re.exec(plain);
    const nome = m?.[1]?.trim().replace(/\s+/g, ' ');
    if (nome && nome.length >= 4 && !/^\d/.test(nome)) return nome.slice(0, 300);
  }
  return null;
}

function extrairReuDoTexto(texto: string | null | undefined): string | null {
  const plain = plainTexto(texto);
  if (!plain) return null;
  const patterns = [
    /\b(?:r[eé]u|requerid[oa]|demandad[oa])[:\s\-–]+([A-ZÁÉÍÓÚÃÕÂÊÔÇ0-9][A-ZÁÉÍÓÚÃÕÂÊÔÇ0-9\s\.\-&\/\(\)]{3,120})/i,
    /\bx\s+([A-ZÁÉÍÓÚÃÕÂÊÔÇ0-9][A-ZÁÉÍÓÚÃÕÂÊÔÇ0-9\s\.\-&\/\(\)]{3,120})(?:\s+[,.\n]|$)/i,
  ];
  for (const re of patterns) {
    const m = re.exec(plain);
    const nome = m?.[1]?.trim().replace(/\s+/g, ' ');
    if (nome && nome.length >= 3) return nome.slice(0, 300);
  }
  return null;
}

const MESES_PT: Record<string, string> = {
  janeiro: '01', fevereiro: '02', marco: '03', março: '03',
  abril: '04', maio: '05', junho: '06', julho: '07',
  agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
};

function extrairDataHora(texto: string | null | undefined): { data: string | null; hora: string | null } {
  if (!texto?.trim()) return { data: null, hora: null };
  const t = texto.toLowerCase();
  let data: string | null = null;
  let hora: string | null = null;

  const mNum = /\b(\d{1,2})[\/\.\-](\d{2})[\/\.\-](\d{4})\b/.exec(t);
  if (mNum) {
    const d = mNum[1]!.padStart(2, '0');
    const m = mNum[2]!;
    const y = mNum[3]!;
    if (+d >= 1 && +d <= 31 && +m >= 1 && +m <= 12 && +y >= 2000 && +y <= 2099) {
      data = `${y}-${m}-${d}`;
    }
  }
  if (!data) {
    const mExt = /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b/.exec(t);
    if (mExt) {
      const d = mExt[1]!.padStart(2, '0');
      const mesNome = mExt[2]!.replace('ç', 'c');
      const m = MESES_PT[mesNome];
      const y = mExt[3]!;
      if (m && +y >= 2000) data = `${y}-${m}-${d}`;
    }
  }

  const mHhMm = /\b(\d{1,2})h(\d{2})(?:min)?\b/.exec(t);
  if (mHhMm) {
    const hh = +mHhMm[1]!; const mm = +mHhMm[2]!;
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59)
      hora = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  if (!hora) {
    const mHM = /\b(\d{1,2}):(\d{2})\b/.exec(t);
    if (mHM) {
      const hh = +mHM[1]!; const mm = +mHM[2]!;
      if (hh >= 6 && hh <= 22 && mm >= 0 && mm <= 59)
        hora = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  }
  return { data, hora };
}

function extrairDataHoraAudiencia(texto: string | null | undefined): { data: string | null; hora: string | null } {
  if (!texto?.trim()) return { data: null, hora: null };
  const plain = texto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const lower = plain.toLowerCase();
  const idx = lower.search(/audi[eê]ncia|sess[aã]o de concilia|designo o dia|designada para|comparecer.*ju[ií]zo/);
  const slice = idx >= 0 ? plain.slice(Math.max(0, idx - 40), idx + 900) : plain;
  return extrairDataHora(slice);
}

function textoIndicaAudiencia(tipo: string | null | undefined, texto: string | null | undefined): boolean {
  const blob = `${tipo ?? ''} ${texto ?? ''}`.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return blob.includes('audiencia') || blob.includes('sessao de conciliacao') ||
    (blob.includes('designad') && blob.includes('dia')) ||
    blob.includes('comparecer') || blob.includes('pauta de audiencia');
}

function inferirFaseInicialDjen(tipo: string | null, audData: string | null, hoje: string): string {
  const t = normTipo(tipo ?? '');
  if (t.includes('SENTENC')) return 'AGUARDANDO_SENTENCA';
  if (t.includes('TRANSIT') || t.includes('TRANSITO')) return 'AGUARDANDO_TRANSITO';
  if (t.includes('ALVAR')) return 'AGUARDANDO_ALVARA';
  if (t.includes('RECUR') || t.includes('APEL')) return 'EM_RECURSO';
  if (audData && audData >= hoje) return 'AGUARDANDO_AUDIENCIA';
  if (t.includes('AUDIEN') || t.includes('CONCILI')) return 'AGUARDANDO_AUDIENCIA';
  if (t.includes('CONTEST') || t.includes('REPLIC')) return 'AGUARDANDO_CONTESTACAO';
  return 'AGUARDANDO_DISTRIBUICAO';
}

// ─── DJEN API ──────────────────────────────────────────────────────────────────

type DjenItem = {
  id?: number | string;
  hash?: string;
  data_disponibilizacao?: string;
  siglaTribunal?: string;
  tipoComunicacao?: string;
  numero_processo?: string;
  numeroprocessocommascara?: string;
  texto?: string;
  tipoDocumento?: string;
  nomeOrgao?: string;
  /** Sempre null — usar `destinatarios` */
  nomeParteAutora?: string | null;
  ativo?: boolean;
  destinatarios?: Array<{ nome: string; polo: string }>;
  destinatarioadvogados?: Array<{
    advogado: { nome: string; numero_oab: string; uf_oab: string };
  }>;
  nomeClasse?: string;
  link?: string;
};

type DjenResponse = {
  status: string;
  message?: string;
  items?: DjenItem[];
  totalItems?: number;
};

function extrairLoginDeComunica(
  item: DjenItem,
  oabEscuta: string,
): string | null {
  const candidatos = (item.destinatarioadvogados ?? [])
    .map((row) => row.advogado)
    .filter((adv) => adv?.numero_oab?.trim() && adv?.uf_oab?.trim())
    .map((adv) =>
      `${adv!.numero_oab.trim()}/${adv!.uf_oab.trim()}`.toUpperCase(),
    );

  const alvo = oabEscuta.trim().toUpperCase();
  const match = candidatos.find((c) => c === alvo);
  if (match) return match.slice(0, 50);
  if (!candidatos.length) return alvo.slice(0, 50);
  return candidatos[0]?.slice(0, 50) ?? null;
}

async function fetchDjenPage(
  oab: string, uf: string, dataInicio: string, dataFim: string, pagina: number,
): Promise<DjenResponse> {
  const url = new URL(`${DJEN_BASE}/comunicacao`);
  url.searchParams.set('pagina', String(pagina));
  url.searchParams.set('itensPorPagina', '100');
  url.searchParams.set('numeroOab', oab);
  url.searchParams.set('ufOab', uf);
  url.searchParams.set('dataDisponibilizacaoInicio', dataInicio);
  url.searchParams.set('dataDisponibilizacaoFim', dataFim);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`DJEN HTTP ${res.status}`);
  return res.json() as Promise<DjenResponse>;
}

async function fetchDjenTudo(oab: string, uf: string, dataInicio: string, dataFim: string): Promise<DjenItem[]> {
  const items: DjenItem[] = [];
  let pagina = 1;
  while (pagina <= 30) {
    process.stdout.write(`\r  página ${pagina}…  `);
    const page = await fetchDjenPage(oab, uf, dataInicio, dataFim, pagina);
    if (!page.items?.length) break;
    items.push(...page.items);
    if (page.items.length < 100) break;
    pagina++;
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`\r  ${items.length} publicações recebidas      `);
  return items;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL não definida');

  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();

  // Escritório
  let escritorioId = process.env.ESCRITORIO_ID?.trim();
  if (!escritorioId) {
    const r = await pg.query('SELECT id, nome FROM escritorio LIMIT 2');
    if (r.rows.length === 0) throw new Error('Nenhum escritório cadastrado no banco.');
    if (r.rows.length > 1) throw new Error('Mais de um escritório — defina ESCRITORIO_ID=...');
    escritorioId = r.rows[0].id as string;
    console.log(`Escritório: ${r.rows[0].nome} (${escritorioId})`);
  }

  // OAB
  let oabRaw = process.env.OAB?.trim();
  if (!oabRaw) {
    const r = await pg.query(
      'SELECT oab FROM oab_escuta WHERE escritorio_id = $1 ORDER BY created_at LIMIT 1',
      [escritorioId],
    );
    oabRaw = r.rows[0]?.oab as string | undefined;
  }
  if (!oabRaw) throw new Error('Nenhuma OAB cadastrada. Defina OAB=66364/BA ou cadastre em oab_escuta.');

  const t = oabRaw.trim().toUpperCase();
  let oabNumero = '', oabUf = '';
  const m1 = t.match(/^(\d+)[\/\-]([A-Z]{2})$/);
  const m2 = t.match(/^([A-Z]{2})(\d+)$/);
  if (m1) { oabNumero = m1[1]!; oabUf = m1[2]!; }
  else if (m2) { oabNumero = m2[2]!; oabUf = m2[1]!; }
  else throw new Error(`OAB inválida: ${oabRaw}`);

  const hoje = new Date();
  const dataInicio = isoDate(addDays(hoje, -DIAS_JANELA));
  const dataFim = isoDate(hoje);
  const hojeStr = hojeYmd();

  console.log(`\n=== Importação DJEN — OAB ${oabNumero}/${oabUf} — ${DIAS_JANELA} dias ===`);
  console.log(`Janela: ${dataInicio} → ${dataFim}\n`);

  const items = await fetchDjenTudo(oabNumero, oabUf, dataInicio, dataFim);
  const ativos = items.filter((i) => i.ativo !== false);
  console.log(`${ativos.length} publicações ativas para processar\n`);

  let processosNovos = 0, comunicacoesNovas = 0, jaExistiam = 0, erros = 0;

  for (let idx = 0; idx < ativos.length; idx++) {
    const item = ativos[idx]!;
    process.stdout.write(`\r  [${idx + 1}/${ativos.length}] proc=${processosNovos} comm=${comunicacoesNovas} err=${erros}   `);

    try {
      const digits = (item.numero_processo ?? '').replace(/\D/g, '');
      if (digits.length < MIN_DIGITOS) { erros++; continue; }

      const numero = normalizarNumero(item.numeroprocessocommascara, digits);
      const vara = item.nomeOrgao?.trim().slice(0, 50) ?? null;
      const sistema = inferirSistema(item.siglaTribunal ?? '', item.nomeOrgao ?? '');
      const texto = item.texto ?? null;
      const tipo = item.tipoComunicacao ?? null;
      const dispYmd = ymdFromDisponibilizacao(item.data_disponibilizacao);
      const dispTs = item.data_disponibilizacao ? new Date(item.data_disponibilizacao) : new Date();

      const ehAudiencia = textoIndicaAudiencia(tipo, texto);
      const { data: audData, hora: audHora } = ehAudiencia
        ? extrairDataHoraAudiencia(texto)
        : { data: null, hora: null };
      const fase = inferirFaseInicialDjen(tipo, audData, hojeStr);
      const clienteNome =
        item.destinatarios?.find((d) => d.polo === 'A')?.nome?.trim() ||
        item.nomeParteAutora?.trim() ||
        extrairAutorDoTexto(texto);
      const reuTexto = extrairReuDoTexto(texto);
      const login = extrairLoginDeComunica(item, `${oabNumero}/${oabUf}`);

      // Upsert processo (ignora se já existe pelo UNIQUE escritorio_id + numero)
      const procRes = await pg.query<{ id: string; existed: boolean }>(
        `INSERT INTO processo (
           id, escritorio_id, numero, login, sistema, vara,
           cliente_nome, reu_texto,
           fase_atual, status_processo,
           data_distribuicao,
           ultima_movimentacao_dt, ultima_movimentacao_tipo,
           requer_conferencia, origem_criacao,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8,
           $9, 'ATIVO',
           $10::date,
           $11, $12,
           true, 'ONBOARDING',
           now(), now()
         )
         ON CONFLICT (escritorio_id, numero) DO NOTHING
         RETURNING id, false AS existed`,
        [
          randomUUID(), escritorioId, numero, login, sistema, vara,
          clienteNome ?? null, reuTexto,
          fase,
          dispYmd,
          dispTs, tipo,
        ],
      );

      let processoId: string;
      let criouProcesso = false;

      if (procRes.rows.length > 0) {
        processoId = procRes.rows[0]!.id;
        criouProcesso = true;
        processosNovos++;
      } else {
        const existing = await pg.query<{ id: string; cliente_nome: string | null }>(
          'SELECT id, cliente_nome FROM processo WHERE escritorio_id = $1 AND numero = $2',
          [escritorioId, numero],
        );
        if (!existing.rows[0]) { erros++; continue; }
        processoId = existing.rows[0].id;

        // Preenche cliente_nome se ainda vazio e temos o dado
        if (clienteNome && !existing.rows[0].cliente_nome?.trim()) {
          await pg.query(
            'UPDATE processo SET cliente_nome = $1, updated_at = now() WHERE id = $2',
            [clienteNome.slice(0, 300), processoId],
          );
        }
      }

      // Comunicação (ignora duplicatas pelo hash ou id DJEN)
      const hashExterno = item.hash ?? item.id ?? null;
      if (hashExterno) {
        const existe = await pg.query(
          'SELECT 1 FROM comunicacao WHERE escritorio_id = $1 AND hash_externo = $2',
          [escritorioId, hashExterno],
        );
        if (existe.rows.length > 0) { jaExistiam++; continue; }
      }

      const oabNorm = `${oabNumero}/${oabUf}`;
      await pg.query(
        `INSERT INTO comunicacao (
           id, escritorio_id, processo_id,
           oab, numero_processo_bruto,
           tipo, resumo,
           data_disponibilizacao,
           hash_externo, status,
           created_at
         ) VALUES (
           $1, $2, $3,
           $4, $5,
           $6, $7,
           $8,
           $9, 'NAO_LIDA',
           now()
         )
         ON CONFLICT DO NOTHING`,
        [
          randomUUID(), escritorioId, processoId,
          oabNorm, numero,
          tipo, texto,
          dispTs,
          hashExterno,
        ],
      );

      // Atualiza ultima_movimentacao no processo se mais recente
      if (!criouProcesso) {
        await pg.query(
          `UPDATE processo
           SET ultima_movimentacao_dt = $1,
               ultima_movimentacao_tipo = $2,
               updated_at = now()
           WHERE id = $3
             AND (ultima_movimentacao_dt IS NULL OR ultima_movimentacao_dt < $1)`,
          [dispTs, tipo, processoId],
        );
      }

      comunicacoesNovas++;

    } catch (e) {
      erros++;
      if (process.env.DEBUG) console.error('\n  erro:', (e as Error).message);
    }
  }

  console.log('\n');

  // Relatório final
  const resumo = await pg.query(
    `SELECT
       (SELECT count(*)::int FROM processo WHERE escritorio_id = $1) AS total_processos,
       (SELECT count(*)::int FROM comunicacao WHERE escritorio_id = $1) AS total_comunicacoes,
       (SELECT count(*)::int FROM processo WHERE escritorio_id = $1 AND cliente_nome IS NOT NULL AND trim(cliente_nome) <> '') AS com_cliente,
       (SELECT count(*)::int FROM processo WHERE escritorio_id = $1 AND reu_texto IS NOT NULL) AS com_reu,
       (SELECT count(*)::int FROM processo WHERE escritorio_id = $1 AND ultima_movimentacao_dt IS NOT NULL) AS com_movimentacao,
       (SELECT count(*)::int FROM processo WHERE escritorio_id = $1 AND fase_atual <> 'AGUARDANDO_DISTRIBUICAO') AS com_fase_real`,
    [escritorioId],
  );

  const r = resumo.rows[0] as Record<string, number>;
  console.log('─── Resultado ──────────────────────────────');
  console.log(`  Processos novos criados : ${processosNovos}`);
  console.log(`  Comunicações novas      : ${comunicacoesNovas}`);
  console.log(`  Já existiam (skip)      : ${jaExistiam}`);
  console.log(`  Erros                   : ${erros}`);
  console.log('─── Banco (total) ──────────────────────────');
  console.log(`  Total processos         : ${r.total_processos}`);
  console.log(`  Total comunicações      : ${r.total_comunicacoes}`);
  console.log(`  Com nome de cliente     : ${r.com_cliente}`);
  console.log(`  Com réu                 : ${r.com_reu}`);
  console.log(`  Com última movimentação : ${r.com_movimentacao}`);
  console.log(`  Com fase real (≠ AGUARD): ${r.com_fase_real}`);
  console.log('────────────────────────────────────────────\n');

  await pg.end();
}

main().catch((e) => {
  console.error('\n✗', (e as Error).message);
  process.exit(1);
});
