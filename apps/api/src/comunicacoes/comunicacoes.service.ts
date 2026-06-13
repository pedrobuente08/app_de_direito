import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { escritorio } from '../db/schema/escritorio';
import { comunicacao } from '../db/schema/comunicacao';
import { oabEscuta } from '../db/schema/oab-escuta';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { AuditService } from '../audit/audit.service';
import { DrizzleService } from '../db/drizzle.service';
import type { VaraConfig } from '../db/schema/escritorio';
import { AudienciasService } from '../audiencias/audiencias.service';
import { FaseDerivacaoService } from '../fase-derivacao/fase-derivacao.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { ProcessosHipossuficienciaService } from '../processos/processos-hipossuficiencia.service';
import { PendenciasService } from '../pendencias/pendencias.service';
import { ProcessosService } from '../processos/processos.service';
import { ParceirosService } from '../parceiros/parceiros.service';
import { EnriquecimentoQueueService } from '../enriquecimento/enriquecimento-queue.service';
import { PjeService } from '../pje/pje.service';
import type { CadastrarOabDto } from './dto/cadastrar-oab.dto';
import type { ComunicacaoWebhookDto } from './dto/comunicacao-webhook.dto';
import type { ResolverComunicacaoDto } from './dto/resolver-comunicacao.dto';
import type { ComunicaApiItem } from './comunica-api.types';

function resumoDeTexto(html: string | undefined, max = 500): string | null {
  if (!html?.trim()) return null;
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return null;
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

function normNumero(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  return raw.replace(/\D/g, '') || null;
}

const MIN_DIGITOS_NUMERO_PROCESSO = 15;

function numeroProcessoValido(digits: string | null): boolean {
  return Boolean(digits && digits.length >= MIN_DIGITOS_NUMERO_PROCESSO);
}

function formatNumeroCnj(digits: string): string {
  if (digits.length !== 20) return digits;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}

function numeroExibicao(
  bruto: string | null,
  digits: string,
): string {
  const masc = bruto?.trim();
  if (masc && masc.replace(/\D/g, '').length >= MIN_DIGITOS_NUMERO_PROCESSO) {
    return masc.slice(0, 30);
  }
  return formatNumeroCnj(digits).slice(0, 30);
}

function inferirSistema(item: ComunicaApiItem): string {
  const tribunal = (item.siglaTribunal ?? '').toUpperCase();
  const org = (item.nomeOrgao ?? '').toUpperCase();
  if (tribunal.includes('PJE') || org.includes('PJE')) return 'PJE_TJBA';
  return 'PROJUDI';
}

function extrairVara(item: ComunicaApiItem): string | null {
  const org = item.nomeOrgao?.trim();
  return org ? org.slice(0, 50) : null;
}

/** OAB do advogado destinatário (ex.: `66364/BA`), preferindo a OAB da escuta. */
function extrairLoginDeComunica(
  item: ComunicaApiItem,
  oabEscuta?: string | null,
): string | null {
  const candidatos = (item.destinatarioadvogados ?? [])
    .map((row) => row.advogado)
    .filter((adv) => adv?.numero_oab?.trim() && adv?.uf_oab?.trim())
    .map((adv) =>
      `${adv!.numero_oab.trim()}/${adv!.uf_oab.trim()}`.toUpperCase(),
    );

  const alvo = oabEscuta?.trim().toUpperCase();
  if (alvo) {
    const match = candidatos.find((c) => c === alvo);
    if (match) return match.slice(0, 50);
    if (!candidatos.length) return alvo.slice(0, 50);
  }

  return candidatos[0]?.slice(0, 50) ?? null;
}

/** Nome do advogado destinatário, preferindo o que corresponde à OAB da escuta. */
function extrairNomeAdvogadoDeComunica(
  item: ComunicaApiItem,
  oabEscuta?: string | null,
): string | null {
  const advs = (item.destinatarioadvogados ?? []).map((r) => r.advogado).filter(Boolean);
  if (!advs.length) return null;

  const alvo = oabEscuta?.trim().toUpperCase();
  if (alvo) {
    const match = advs.find(
      (adv) =>
        adv?.numero_oab?.trim() &&
        adv?.uf_oab?.trim() &&
        `${adv.numero_oab.trim()}/${adv.uf_oab.trim()}`.toUpperCase() === alvo,
    );
    if (match?.nome?.trim()) return match.nome.trim().slice(0, 300);
  }

  return advs[0]?.nome?.trim()?.slice(0, 300) ?? null;
}

export type OrigemCriacaoProcesso = 'DJEN_AUTO' | 'ONBOARDING';

export type IngestCapturaOpts = {
  origemCriacao?: OrigemCriacaoProcesso;
};

export type IngestCapturaResult = {
  nova: boolean;
  orfa: boolean;
  comunicacaoId?: string;
  processoCriado?: boolean;
};

type ComunicaRegra = {
  criar_pendencia?: boolean;
  tipo_pendencia?: string;
  prazo_dias?: number;
  sincronizar_audiencia?: boolean;
  /** Tipo gravado na audiência (default: tipo da comunicação ou `COMUNICA`). */
  audiencia_tipo?: string;
  /** Fase para a qual o processo deve avançar ao receber este tipo de publicação. */
  avancar_fase?: string;
};

const MESES_PT: Record<string, string> = {
  janeiro: '01', fevereiro: '02', marco: '03', março: '03',
  abril: '04', maio: '05', junho: '06', julho: '07',
  agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
};

/**
 * Extrai data (YYYY-MM-DD) e hora (HH:mm) do texto de uma publicação judicial.
 * Cobre os formatos mais comuns do PJe/DJEN: numérico (DD/MM/YYYY, DD.MM.YYYY),
 * extenso ("15 de junho de 2026") e hora no padrão "HHhMM", "HHhMMmin" ou "HH:MM".
 */
function extrairDataHoraDeResumo(
  texto: string | null | undefined,
): { data: string | null; hora: string | null } {
  if (!texto?.trim()) return { data: null, hora: null };

  const t = texto.toLowerCase();
  let data: string | null = null;
  let hora: string | null = null;

  // DD/MM/YYYY · DD.MM.YYYY · DD-MM-YYYY
  const mNum = /\b(\d{1,2})[\/\.\-](\d{2})[\/\.\-](\d{4})\b/.exec(t);
  if (mNum) {
    const d = mNum[1]!.padStart(2, '0');
    const m = mNum[2]!;
    const y = mNum[3]!;
    if (+d >= 1 && +d <= 31 && +m >= 1 && +m <= 12 && +y >= 2000 && +y <= 2099) {
      data = `${y}-${m}-${d}`;
    }
  }

  // "15 de junho de 2026"
  if (!data) {
    const mExt =
      /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b/.exec(t);
    if (mExt) {
      const d = mExt[1]!.padStart(2, '0');
      const mesNome = mExt[2]!.replace('ç', 'c');
      const m = MESES_PT[mesNome];
      const y = mExt[3]!;
      if (m && +y >= 2000) data = `${y}-${m}-${d}`;
    }
  }

  // HHhMMmin | HHhMM (e.g. "14h30", "9h00min")
  const mHhMm = /\b(\d{1,2})h(\d{2})(?:min)?\b/.exec(t);
  if (mHhMm) {
    const hh = +mHhMm[1]!;
    const mm = +mHhMm[2]!;
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      hora = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  }

  // "às 14h" (hora exata sem minutos)
  if (!hora) {
    const mHSolo = /\bàs?\s+(\d{1,2})h\b/.exec(t);
    if (mHSolo) {
      const hh = +mHSolo[1]!;
      if (hh >= 0 && hh <= 23) hora = `${String(hh).padStart(2, '0')}:00`;
    }
  }

  // HH:MM (restrito 06-22h para evitar falso-positivo com nº de processo)
  if (!hora) {
    const mHM = /\b(\d{1,2}):(\d{2})\b/.exec(t);
    if (mHM) {
      const hh = +mHM[1]!;
      const mm = +mHM[2]!;
      if (hh >= 6 && hh <= 22 && mm >= 0 && mm <= 59) {
        hora = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }
    }
  }

  return { data, hora };
}

function hojeYmdBr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}

function textoIndicaAudiencia(
  tipo: string | null | undefined,
  texto: string | null | undefined,
): boolean {
  const blob = `${tipo ?? ''} ${texto ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return (
    blob.includes('audiencia') ||
    blob.includes('sessao de conciliacao') ||
    (blob.includes('designad') && blob.includes('dia')) ||
    blob.includes('comparecer') ||
    blob.includes('pauta de audiencia') ||
    blob.includes('ata de audiencia')
  );
}

/** Extrai data/hora próximas a menções de audiência no corpo da publicação. */
function extrairDataHoraAudiencia(
  texto: string | null | undefined,
): { data: string | null; hora: string | null } {
  if (!texto?.trim()) return { data: null, hora: null };
  const plain = texto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const lower = plain.toLowerCase();
  const idx = lower.search(
    /audi[eê]ncia|sess[aã]o de concilia|designo o dia|designada para|comparecer.*ju[ií]zo/,
  );
  const slice =
    idx >= 0 ? plain.slice(Math.max(0, idx - 40), idx + 900) : plain;
  return extrairDataHoraDeResumo(slice);
}

function plainTexto(html: string | null | undefined): string {
  if (!html?.trim()) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Valida que uma string extraída do texto parece um nome de pessoa ou empresa —
 * não um trecho de sentença ou texto jurídico genérico.
 */
function pareceNomePessoa(s: string): boolean {
  const palavras = s.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0 || palavras.length > 6) return false;
  // Rejeita se qualquer palavra for um termo jurídico/verbal óbvio que não compõe nomes
  const naoNome =
    /^(intimad[ao]|penhor[ao]?|juiz|ju[ií]z[ao]|excelent[ií]ssim[ao]|exm[oa]|ordem|desta|deste|nesta|neste|total|online|virtual|fica|a[çc][aã]o|processo|autos|parte|polo|pelo|pela|para|com|que|uma?|nos|nas|daquela?|daquele|aquela?|aquele|dever[aá])$/i;
  if (palavras.some((p) => naoNome.test(p))) return false;
  // Primeira palavra deve começar com letra maiúscula (nomes próprios)
  if (!/^[A-ZÁÉÍÓÚÃÕÂÊÔÇ]/i.test(palavras[0])) return false;
  return true;
}

/** Tenta extrair nome do autor do corpo quando `nomeParteAutora` vem vazio. */
function extrairAutorDoTexto(texto: string | null | undefined): string | null {
  const plain = plainTexto(texto);
  if (!plain) return null;
  // Sem '.' na classe de caracteres para não cruzar fronteiras de frase
  const patterns = [
    /\b(?:autor(?:a)?|requerente|promovente)[:\s\-–]+([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ\s\-'"]{3,80})/i,
    /\b([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇ\s\-'"]{4,80})\s+x\s+[A-ZÁÉÍÓÚÃÕÂÊÔÇ]/,
  ];
  for (const re of patterns) {
    const m = re.exec(plain);
    const nome = m?.[1]?.trim().replace(/\s+/g, ' ');
    if (nome && nome.length >= 4 && !/^\d/.test(nome) && pareceNomePessoa(nome)) {
      return nome.slice(0, 300);
    }
  }
  return null;
}

/** Tenta extrair réu do corpo da publicação. */
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
    if (nome && nome.length >= 3) {
      return nome.slice(0, 300);
    }
  }
  return null;
}

function ymdFromDisponibilizacao(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function inferirFaseInicialDjen(
  tipo: string | null,
  audData: string | null,
  hoje: string,
): string {
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

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Remove acentos e normaliza para uppercase — usado no matching de regras. */
function normTipo(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').trim().toUpperCase();
}

/**
 * Resolve a regra aplicável a um tipo de publicação.
 * Prioridade: match exato normalizado > substring (mais longo vence) > wildcard `*`.
 * Ignora acentuação em ambos os lados para suportar variações entre tribunais.
 */
function resolverRegra(
  regras: Record<string, ComunicaRegra>,
  tipoBruto: string | null | undefined,
): ComunicaRegra | undefined {
  const tipoNorm = tipoBruto?.trim() ? normTipo(tipoBruto) : '';

  let melhor: ComunicaRegra | undefined;
  let melhorLen = -1;

  for (const [chave, regra] of Object.entries(regras)) {
    if (chave === '*') continue;
    const chaveNorm = normTipo(chave);
    if (!chaveNorm) continue;
    if (tipoNorm === chaveNorm || tipoNorm.includes(chaveNorm)) {
      if (chaveNorm.length > melhorLen) {
        melhor = regra;
        melhorLen = chaveNorm.length;
      }
    }
  }

  return melhor ?? regras['*'];
}

@Injectable()
export class ComunicacoesService {
  private readonly log = new Logger(ComunicacoesService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly pendencias: PendenciasService,
    private readonly audiencias: AudienciasService,
    private readonly processos: ProcessosService,
    private readonly faseDerivacao: FaseDerivacaoService,
    private readonly notificacoes: NotificacoesService,
    private readonly audit: AuditService,
    private readonly encadeamentos: EncadeamentosQueueService,
    private readonly hipossuf: ProcessosHipossuficienciaService,
    private readonly pje: PjeService,
    private readonly parceiros: ParceirosService,
    private readonly enriquecimentoQueue: EnriquecimentoQueueService,
  ) {}

  private async validarTokenEscritorio(
    escritorioId: string,
    token: string,
  ): Promise<void> {
    const [row] = await this.drizzle.db
      .select({ config: escritorio.config })
      .from(escritorio)
      .where(eq(escritorio.id, escritorioId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Escritório não encontrado');
    }

    const cfg = (row.config ?? {}) as EscritorioConfig;
    const expected = cfg.comunica_webhook_token?.trim();
    if (!expected || expected !== token.trim()) {
      throw new ForbiddenException('Token de webhook inválido');
    }
  }

  private async aplicarRegras(
    escritorioId: string,
    comRow: typeof comunicacao.$inferSelect,
    tipoBruto: string | null | undefined,
  ) {
    if (!comRow.processoId) {
      return;
    }

    const [eRow] = await this.drizzle.db
      .select({ config: escritorio.config })
      .from(escritorio)
      .where(eq(escritorio.id, escritorioId))
      .limit(1);

    const regras = (eRow?.config as EscritorioConfig | undefined)?.comunica_regras as
      | Record<string, ComunicaRegra>
      | undefined;

    if (!regras || typeof regras !== 'object') {
      return;
    }

    const rule = resolverRegra(regras, tipoBruto);
    if (!rule) {
      return;
    }

    const erros: string[] = [];
    let acoesTentadas = 0;
    let acoesOk = 0;

    if (rule.criar_pendencia && rule.tipo_pendencia?.trim()) {
      acoesTentadas++;
      const prazo = Number(rule.prazo_dias);
      const dataLimite =
        Number.isFinite(prazo) && prazo > 0 ? addDaysIso(prazo) : undefined;

      try {
        const pend = await this.pendencias.criar(escritorioId, {
          processoId: comRow.processoId,
          tipo: rule.tipo_pendencia.trim(),
          dataLimite: dataLimite ?? null,
          origem: 'COMUNICA',
          observacao: comRow.resumo?.slice(0, 2000) ?? null,
        });

        await this.drizzle.db
          .update(comunicacao)
          .set({ pendenciaGeradaId: pend.id })
          .where(eq(comunicacao.id, comRow.id));
        acoesOk++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        erros.push(`pendencia: ${msg.slice(0, 200)}`);
        this.log.warn(`aplicarRegras pendencia falhou comId=${comRow.id}: ${msg}`);
      }
    }

    if (rule.sincronizar_audiencia) {
      acoesTentadas++;
      const { data: dataExtraida, hora: horaExtraida } = extrairDataHoraDeResumo(comRow.resumo);
      const dataStr =
        dataExtraida ??
        (comRow.dataDisponibilizacao
          ? comRow.dataDisponibilizacao.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10));
      const tipoAud = (
        rule.audiencia_tipo?.trim() ||
        comRow.tipo?.trim() ||
        'COMUNICA'
      ).slice(0, 50);

      try {
        await this.audiencias.criar(escritorioId, {
          processoId: comRow.processoId,
          tipo: tipoAud || null,
          data: dataStr,
          hora: horaExtraida,
          status: 'AGENDADA',
          obsPre: comRow.resumo?.slice(0, 2000) ?? null,
        });
        acoesOk++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        erros.push(`audiencia: ${msg.slice(0, 200)}`);
        this.log.warn(`aplicarRegras audiencia falhou comId=${comRow.id}: ${msg}`);
      }
    }

    if (rule.avancar_fase?.trim()) {
      acoesTentadas++;
      try {
        await this.faseDerivacao.forcarFase(
          escritorioId,
          comRow.processoId,
          rule.avancar_fase.trim(),
        );
        acoesOk++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        erros.push(`fase: ${msg.slice(0, 200)}`);
        this.log.warn(`aplicarRegras fase falhou comId=${comRow.id}: ${msg}`);
      }
    }

    const resultado =
      acoesTentadas === 0 ? null
      : erros.length === 0 ? 'OK'
      : acoesOk > 0 ? 'PARCIAL'
      : 'FALHA';

    await this.drizzle.db
      .update(comunicacao)
      .set({
        regrasResultado: resultado,
        regrasErro: erros.length > 0 ? erros.join(' | ') : null,
      })
      .where(eq(comunicacao.id, comRow.id));

    try {
      if (resultado === 'OK') {
        const acoes: string[] = [];
        if (rule.criar_pendencia && rule.tipo_pendencia) acoes.push(`pendência "${rule.tipo_pendencia}"`);
        if (rule.sincronizar_audiencia) acoes.push('audiência criada');
        if (rule.avancar_fase) acoes.push(`fase → ${rule.avancar_fase}`);
        await this.notificacoes.criar({
          escritorioId,
          tipoGatilho: 'REGRA_COMUNICA_OK',
          entidade: 'comunicacao',
          entidadeId: comRow.id,
          titulo: 'Automação aplicada',
          mensagem: `Publicação "${comRow.tipo ?? 'sem tipo'}" (${comRow.numeroProcessoBruto ?? 'sem nº'}): ${acoes.join(', ')}.`,
          prioridade: 'BAIXA',
        });
      } else if (resultado === 'FALHA' || resultado === 'PARCIAL') {
        await this.notificacoes.criar({
          escritorioId,
          tipoGatilho: 'REGRA_COMUNICA_FALHA',
          entidade: 'comunicacao',
          entidadeId: comRow.id,
          titulo: 'Automação aplicada com erro',
          mensagem: `Publicação "${comRow.tipo ?? 'sem tipo'}" do processo ${comRow.numeroProcessoBruto ?? comRow.processoId}: ${erros.join('; ')}`,
          prioridade: 'MEDIA',
        });
      }
    } catch {
      /* não bloqueia o fluxo principal */
    }

    const tipoNorm = tipoBruto ? normTipo(tipoBruto) : '';
    if (tipoNorm && comRow.processoId) {
      await this.pje.aplicarTipoComunicaPje(
        escritorioId,
        comRow.processoId,
        tipoNorm,
      );
    }
  }

  async digest(escritorioId: string, dias: number) {
    const d = Math.min(Math.max(dias, 1), 90);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - d);

    const base = and(
      eq(comunicacao.escritorioId, escritorioId),
      gte(comunicacao.createdAt, from),
    );

    const db = this.drizzle.db;

    const porTipo = await db
      .select({
        tipo: comunicacao.tipo,
        total: count(),
      })
      .from(comunicacao)
      .where(base)
      .groupBy(comunicacao.tipo);

    const porStatus = await db
      .select({
        status: comunicacao.status,
        total: count(),
      })
      .from(comunicacao)
      .where(base)
      .groupBy(comunicacao.status);

    const [totRow] = await db
      .select({ total: count() })
      .from(comunicacao)
      .where(base);

    return {
      periodoDias: d,
      desde: from.toISOString(),
      total: totRow?.total ?? 0,
      porTipo,
      porStatus,
    };
  }

  private async obterConfigEscritorio(
    escritorioId: string,
  ): Promise<EscritorioConfig> {
    const [row] = await this.drizzle.db
      .select({ config: escritorio.config })
      .from(escritorio)
      .where(eq(escritorio.id, escritorioId))
      .limit(1);
    return (row?.config ?? {}) as EscritorioConfig;
  }

  private async countComunicacoesProcesso(processoId: string): Promise<number> {
    const [row] = await this.drizzle.db
      .select({ c: count() })
      .from(comunicacao)
      .where(eq(comunicacao.processoId, processoId));
    return row?.c ?? 0;
  }

  private async avaliarAlertaCrVara(
    escritorioId: string,
    processoId: string,
  ): Promise<void> {
    const [proc] = await this.drizzle.db
      .select({
        vara: processo.vara,
        comprovanteResidenciaTipo: processo.comprovanteResidenciaTipo,
        alertaCrVara: processo.alertaCrVara,
      })
      .from(processo)
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      )
      .limit(1);

    if (!proc || proc.comprovanteResidenciaTipo?.trim() || proc.alertaCrVara) {
      return;
    }

    const cfg = await this.obterConfigEscritorio(escritorioId);
    const varaKey = (proc.vara ?? '').trim().toUpperCase();
    if (!varaKey) return;

    const varasCfg = cfg.varas_config as Record<string, VaraConfig> | undefined;
    const varaConfig = varasCfg?.[varaKey];
    if (!varaConfig?.comprovantes_aceitos?.length) return;

    const total = await this.countComunicacoesProcesso(processoId);
    if (total > 1) return;

    await this.drizzle.db
      .update(processo)
      .set({ alertaCrVara: true, updatedAt: new Date() })
      .where(eq(processo.id, processoId));
  }

  private async temPendenciaAberta(
    escritorioId: string,
    processoId: string,
    tipo: string,
  ): Promise<boolean> {
    const [row] = await this.drizzle.db
      .select({ id: pendencia.id })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.processoId, processoId),
          eq(pendencia.tipo, tipo),
          eq(pendencia.status, 'ABERTA'),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  /** Primeira comunicação + vara exigente → pendência ATENDIMENTO (Fase 2 [4]). */
  private async avaliarVaraExigenteDocumento(
    escritorioId: string,
    processoId: string,
  ): Promise<void> {
    const total = await this.countComunicacoesProcesso(processoId);
    if (total > 1) return;

    const [proc] = await this.drizzle.db
      .select({
        varaExigeDocFrequente: processo.varaExigeDocFrequente,
        vara: processo.vara,
      })
      .from(processo)
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      )
      .limit(1);

    if (!proc?.varaExigeDocFrequente) return;

    if (
      await this.temPendenciaAberta(
        escritorioId,
        processoId,
        'SOLICITAR_DOC_CONFORME_VARA',
      )
    ) {
      return;
    }

    const cfg = await this.obterConfigEscritorio(escritorioId);
    const varaKey = (proc.vara ?? '').trim().toUpperCase();
    const varasCfg = cfg.varas_config as Record<string, VaraConfig> | undefined;
    const aceitos = varaKey ? varasCfg?.[varaKey]?.comprovantes_aceitos : undefined;
    const docHint = aceitos?.length ? aceitos.join(', ') : 'conforme vara';
    const observacao = proc.vara
      ? `Vara ${proc.vara}: exige documentação (${docHint})`
      : `Vara exige documentação (${docHint})`;

    await this.encadeamentos.dispatch(escritorioId, 'vara_exigente_documento', {
      processoId,
      observacao,
    });
  }

  private async posComunicacaoVinculada(
    escritorioId: string,
    processoId: string,
  ): Promise<void> {
    const total = await this.countComunicacoesProcesso(processoId);
    if (total <= 1) {
      const [proc] = await this.drizzle.db
        .select({ vara: processo.vara })
        .from(processo)
        .where(eq(processo.id, processoId))
        .limit(1);
      await this.hipossuf.aplicarContatoProativoVara(
        escritorioId,
        processoId,
        proc?.vara,
      );
    }
    await this.avaliarAlertaCrVara(escritorioId, processoId);
    await this.avaliarVaraExigenteDocumento(escritorioId, processoId);
  }

  /**
   * Promove campos estruturados do DJEN para `processo` e agenda audiência futura
   * quando o texto da publicação indicar data ainda não passada.
   */
  private async aplicarEnriquecimentoDjen(
    escritorioId: string,
    processoId: string,
    item: ComunicaApiItem,
    tipo: string | null,
  ): Promise<void> {
    const textoPlain =
      resumoDeTexto(item.texto, 50000) ?? item.texto?.trim() ?? null;
    const hoje = hojeYmdBr();

    const [proc] = await this.drizzle.db
      .select({
        clienteNome: processo.clienteNome,
        reuTexto: processo.reuTexto,
        observacaoGeral: processo.observacaoGeral,
        dataDistribuicao: processo.dataDistribuicao,
        dataAudiencia: processo.dataAudiencia,
        horaAudiencia: processo.horaAudiencia,
        tipoAudiencia: processo.tipoAudiencia,
        faseAtual: processo.faseAtual,
        ultimaMovimentacaoDt: processo.ultimaMovimentacaoDt,
      })
      .from(processo)
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      )
      .limit(1);
    if (!proc) return;

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    let changed = false;

    const clienteDestinatario = item.destinatarios
      ?.find((d) => d.polo === 'A')
      ?.nome?.trim();
    const cliente =
      clienteDestinatario ||
      item.nomeParteAutora?.trim() ||
      extrairAutorDoTexto(textoPlain) ||
      null;
    if (cliente && !proc.clienteNome?.trim()) {
      patch.clienteNome = cliente.slice(0, 300);
      changed = true;
    }

    const reu = extrairReuDoTexto(textoPlain);
    if (reu && !proc.reuTexto?.trim()) {
      patch.reuTexto = reu;
      changed = true;
    }

    const resumoCurto = resumoDeTexto(item.texto, 500);
    if (resumoCurto && !proc.observacaoGeral?.trim()) {
      patch.observacaoGeral = resumoCurto;
      patch.observacoes = resumoCurto;
      changed = true;
    }

    const distYmd = ymdFromDisponibilizacao(item.data_disponibilizacao);
    if (distYmd && !proc.dataDistribuicao) {
      patch.dataDistribuicao = distYmd;
      changed = true;
    }

    const movTs = item.data_disponibilizacao
      ? new Date(item.data_disponibilizacao)
      : null;
    if (
      movTs &&
      !Number.isNaN(movTs.getTime()) &&
      (!proc.ultimaMovimentacaoDt || movTs > proc.ultimaMovimentacaoDt)
    ) {
      patch.ultimaMovimentacaoDt = movTs;
      patch.ultimaMovimentacaoTipo = (tipo ?? 'COMUNICA').slice(0, 50);
      changed = true;
    }

    let audData: string | null = null;
    let audHora: string | null = null;
    if (textoIndicaAudiencia(tipo, textoPlain)) {
      const ext = extrairDataHoraAudiencia(textoPlain);
      audData = ext.data;
      audHora = ext.hora;
    }

    const tipoAud = (
      tipo?.trim() ||
      item.tipoDocumento?.trim() ||
      'AUDIENCIA'
    ).slice(0, 50);

    if (audData && audData >= hoje) {
      patch.dataAudiencia = audData;
      patch.horaAudiencia = audHora;
      patch.tipoAudiencia = tipoAud;
      patch.statusAudiencia = 'AGENDADA';
      changed = true;

      try {
        await this.audiencias.sincronizarDaExtracaoPdf(escritorioId, processoId, {
          dataAudiencia: audData,
          horaAudiencia: audHora,
          tipoAudiencia: tipoAud,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(
          `aplicarEnriquecimentoDjen audiencia processo=${processoId}: ${msg}`,
        );
      }
    } else if (audData && !proc.dataAudiencia) {
      patch.dataAudiencia = audData;
      patch.horaAudiencia = audHora;
      patch.tipoAudiencia = tipoAud;
      changed = true;
    }

    const faseSugerida = inferirFaseInicialDjen(tipo, audData, hoje);
    if (
      faseSugerida &&
      (!proc.faseAtual?.trim() ||
        proc.faseAtual === 'AGUARDANDO_DISTRIBUICAO') &&
      faseSugerida !== proc.faseAtual
    ) {
      patch.faseAtual = faseSugerida;
      patch.faseUpdatedAt = new Date();
      changed = true;
    }

    if (changed) {
      await this.drizzle.db
        .update(processo)
        .set(patch)
        .where(eq(processo.id, processoId));
    }

    await this.faseDerivacao.aplicarAposMutacao(escritorioId, processoId);
  }

  private async criarProcessoDeComunica(
    escritorioId: string,
    numeroProcessoBruto: string | null,
    digits: string,
    item: ComunicaApiItem,
    origemCriacao: OrigemCriacaoProcesso,
    oabEscuta?: string | null,
  ): Promise<string> {
    const numero = numeroExibicao(numeroProcessoBruto, digits);
    const tipo =
      item.tipoComunicacao?.trim() || item.tipoDocumento?.trim() || null;
    const textoPlain =
      resumoDeTexto(item.texto, 50000) ?? item.texto?.trim() ?? null;
    const hoje = hojeYmdBr();
    const clienteDestinatario = item.destinatarios
      ?.find((d) => d.polo === 'A')
      ?.nome?.trim();
    const cliente =
      clienteDestinatario?.slice(0, 300) ||
      item.nomeParteAutora?.trim()?.slice(0, 300) ||
      extrairAutorDoTexto(textoPlain)?.slice(0, 300) ||
      null;
    const reu = extrairReuDoTexto(textoPlain);
    const distYmd = ymdFromDisponibilizacao(item.data_disponibilizacao);
    const movTs = item.data_disponibilizacao
      ? new Date(item.data_disponibilizacao)
      : null;
    let audData: string | null = null;
    let audHora: string | null = null;
    if (textoIndicaAudiencia(tipo, textoPlain)) {
      const ext = extrairDataHoraAudiencia(textoPlain);
      audData = ext.data;
      audHora = ext.hora;
    }
    const faseInicial = inferirFaseInicialDjen(tipo, audData, hoje);
    const resumoCurto = resumoDeTexto(item.texto, 500);
    const login = extrairLoginDeComunica(item, oabEscuta);
    const advogadoNome = extrairNomeAdvogadoDeComunica(item, oabEscuta);

    const [row] = await this.drizzle.db
      .insert(processo)
      .values({
        escritorioId,
        numero,
        login,
        advogadoNome,
        clienteNome: cliente,
        reuTexto: reu,
        vara: extrairVara(item),
        sistema: inferirSistema(item),
        statusProcesso: 'ATIVO',
        faseAtual: faseInicial,
        faseUpdatedAt: new Date(),
        dataDistribuicao: distYmd,
        dataAudiencia: audData,
        horaAudiencia: audHora,
        tipoAudiencia: audData
          ? (tipo?.slice(0, 50) ?? 'AUDIENCIA')
          : null,
        statusAudiencia: audData && audData >= hoje ? 'AGENDADA' : null,
        ultimaMovimentacaoDt: movTs,
        ultimaMovimentacaoTipo: (tipo ?? 'COMUNICA').slice(0, 50),
        observacaoGeral: resumoCurto,
        observacoes: resumoCurto,
        requerConferencia: true,
        origemCriacao,
      })
      .returning({ id: processo.id });

    const id = row!.id;
    await this.audit.registrar({
      escritorioId,
      entidade: 'processo',
      entidadeId: id,
      acao: 'AUTO_CRIADO_DJEN',
      diff: { origemCriacao, numero },
    });

    if (origemCriacao !== 'ONBOARDING') {
      const textoObs = item.texto?.slice(0, 500) ?? null;
      const parceiroId = await this.parceiros.resolverParceiroParaProcesso(
        escritorioId,
        null,
        textoObs,
      );
      if (parceiroId) {
        await this.parceiros.aplicarParceiroNoProcesso(escritorioId, id, parceiroId);
      }
    }

    return id;
  }

  private async resolverProcessoId(
    escritorioId: string,
    numeroProcessoBruto: string | null | undefined,
  ): Promise<string | null> {
    const digits = normNumero(numeroProcessoBruto ?? undefined);
    if (!digits) return null;

    // Tentativa 1: match exato (caminho normal — número CNJ completo)
    const [exato] = await this.drizzle.db
      .select({ id: processo.id })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          sql`regexp_replace(${processo.numero}, '[^0-9]', '', 'g') = ${digits}`,
        ),
      )
      .limit(1);

    if (exato) return exato.id;

    // Tentativa 2: match por prefixo quando o DJEN enviou número incompleto (< 15 dígitos).
    // Só vincula se houver exatamente 1 processo correspondente — ambiguidade = não vincula.
    if (digits.length >= 7 && digits.length < MIN_DIGITOS_NUMERO_PROCESSO) {
      const parciais = await this.drizzle.db
        .select({ id: processo.id })
        .from(processo)
        .where(
          and(
            eq(processo.escritorioId, escritorioId),
            sql`regexp_replace(${processo.numero}, '[^0-9]', '', 'g') LIKE ${digits + '%'}`,
          ),
        )
        .limit(2);

      if (parciais.length === 1) return parciais[0].id;
    }

    return null;
  }

  /** Classificador rule-based: tipo consta em comunica_regras com criar_pendencia? */
  geraPrazoPorRegras(
    regras: Record<string, ComunicaRegra> | undefined,
    tipoBruto: string | null | undefined,
  ): boolean {
    if (!regras) return false;
    const rule = resolverRegra(regras, tipoBruto);
    return Boolean(rule?.criar_pendencia && rule.tipo_pendencia?.trim());
  }

  /**
   * Ingestão idempotente a partir da captura ativa DJEN.
   * Dedup por hash externo (campo `hash` da API Comunica).
   */
  async ingestFromCaptura(
    escritorioId: string,
    oab: string,
    item: ComunicaApiItem,
    opts?: IngestCapturaOpts,
  ): Promise<IngestCapturaResult> {
    if (!item.hash?.trim()) {
      return { nova: false, orfa: false };
    }

    const [existing] = await this.drizzle.db
      .select({ id: comunicacao.id })
      .from(comunicacao)
      .where(
        and(
          eq(comunicacao.escritorioId, escritorioId),
          eq(comunicacao.hashExterno, item.hash.trim()),
        ),
      )
      .limit(1);

    if (existing) {
      return { nova: false, orfa: false, comunicacaoId: existing.id };
    }

    const numeroProcessoBruto =
      item.numeroprocessocommascara?.trim() ||
      item.numero_processo?.trim() ||
      null;
    const digits = normNumero(numeroProcessoBruto ?? undefined);

    let processoId = await this.resolverProcessoId(escritorioId, numeroProcessoBruto);
    let processoCriado = false;

    if (!processoId && numeroProcessoValido(digits)) {
      const origem = opts?.origemCriacao ?? 'DJEN_AUTO';
      processoId = await this.criarProcessoDeComunica(
        escritorioId,
        numeroProcessoBruto,
        digits!,
        item,
        origem,
        oab,
      );
      processoCriado = true;

      const oabRaw = oab.trim().toUpperCase();
      const [numeroOab, ufOab] = oabRaw.includes('/')
        ? oabRaw.split('/')
        : [oabRaw, ''];
      void this.enriquecimentoQueue
        .enfileirar({
          processoId,
          escritorioId,
          numeroProcesso: numeroProcessoBruto ?? digits!,
          oab: numeroOab,
          ufOab: ufOab,
        })
        .catch((err) =>
          this.log.warn(`Falha ao enfileirar enriquecimento processo=${processoId}: ${err}`),
        );
    }

    const tipo = item.tipoComunicacao?.trim() || item.tipoDocumento?.trim() || null;

    const [row] = await this.drizzle.db
      .insert(comunicacao)
      .values({
        escritorioId,
        processoId,
        oab: oab.trim().toUpperCase(),
        numeroProcessoBruto,
        tipo,
        resumo: resumoDeTexto(item.texto, 2000),
        conteudoCompleto: item.texto?.trim() || null,
        dataDisponibilizacao: item.data_disponibilizacao
          ? new Date(item.data_disponibilizacao)
          : null,
        hashExterno: item.hash.trim(),
        status: processoId ? 'NAO_LIDA' : 'ORFA',
      })
      .returning();

    if (row) {
      if (row.processoId) {
        if (opts?.origemCriacao !== 'ONBOARDING') {
          await this.posComunicacaoVinculada(escritorioId, row.processoId);
        }
        await this.aplicarEnriquecimentoDjen(
          escritorioId,
          row.processoId,
          item,
          tipo,
        );
      }
      await this.aplicarRegras(escritorioId, row, tipo);
      return {
        nova: true,
        comunicacaoId: row.id,
        orfa: row.status === 'ORFA',
        processoCriado,
      };
    }

    return { nova: false, orfa: false };
  }

  async registrarWebhook(dto: ComunicacaoWebhookDto) {
    await this.validarTokenEscritorio(dto.escritorioId, dto.token);

    const processoId = await this.resolverProcessoId(
      dto.escritorioId,
      dto.numeroProcessoBruto ?? undefined,
    );

    const [row] = await this.drizzle.db
      .insert(comunicacao)
      .values({
        escritorioId: dto.escritorioId,
        processoId,
        oab: dto.oab.trim().toUpperCase(),
        numeroProcessoBruto: dto.numeroProcessoBruto?.trim() || null,
        tipo: dto.tipo?.trim() || null,
        resumo: dto.resumo?.trim() || null,
        conteudoCompleto: dto.conteudoCompleto?.trim() || null,
        dataDisponibilizacao: dto.dataDisponibilizacao
          ? new Date(dto.dataDisponibilizacao)
          : null,
        status: processoId ? 'NAO_LIDA' : 'ORFA',
      })
      .returning();

    if (row) {
      await this.aplicarRegras(dto.escritorioId, row, dto.tipo);
    }

    return row;
  }

  async listar(escritorioId: string, page = 1, pageSize = 30) {
    const offset = (page - 1) * pageSize;
    const where = eq(comunicacao.escritorioId, escritorioId);
    const [totalRow] = await this.drizzle.db.select({ c: count() }).from(comunicacao).where(where);
    const data = await this.drizzle.db
      .select()
      .from(comunicacao)
      .where(where)
      .orderBy(desc(comunicacao.createdAt))
      .limit(pageSize)
      .offset(offset);
    const total = totalRow?.c ?? 0;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  /**
   * Tenta re-vincular comunicações ÓRFÃ ao processo correto.
   * Chamado pelo cron diário — não lança exceção.
   */
  async tentarResolverOrfas(escritorioId: string): Promise<{ resolvidas: number }> {
    const orfas = await this.drizzle.db
      .select()
      .from(comunicacao)
      .where(
        and(
          eq(comunicacao.escritorioId, escritorioId),
          eq(comunicacao.status, 'ORFA'),
        ),
      )
      .limit(200);

    let resolvidas = 0;
    for (const com of orfas) {
      if (!com.numeroProcessoBruto) continue;
      const processoId = await this.resolverProcessoId(escritorioId, com.numeroProcessoBruto);
      if (!processoId) continue;

      await this.drizzle.db
        .update(comunicacao)
        .set({ processoId, status: 'NAO_LIDA' })
        .where(eq(comunicacao.id, com.id));

      await this.aplicarRegras(escritorioId, { ...com, processoId }, com.tipo);
      resolvidas++;
    }

    return { resolvidas };
  }

  /**
   * Corrige em massa nomes de cliente em processos criados automaticamente pelo DJEN.
   * Para cada processo com nome ausente ou inválido, tenta re-extrair do texto da publicação.
   * Se não encontrar, zera o campo (fica em branco para preenchimento manual).
   */
  async limparNomesDjen(escritorioId: string): Promise<{
    total: number;
    corrigidos: number;
    zerados: number;
    semMudanca: number;
  }> {
    const processosDjen = await this.drizzle.db
      .select({ id: processo.id, clienteNome: processo.clienteNome })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          inArray(processo.origemCriacao, ['DJEN_AUTO', 'DJEN_WEBHOOK']),
        ),
      );

    let corrigidos = 0;
    let zerados = 0;
    let semMudanca = 0;

    for (const proc of processosDjen) {
      const nomeAtual = proc.clienteNome?.trim() || null;

      if (nomeAtual && pareceNomePessoa(nomeAtual)) {
        semMudanca++;
        continue;
      }

      // Tenta extrair nome das publicações vinculadas ao processo
      const coms = await this.drizzle.db
        .select({ texto: comunicacao.conteudoCompleto, resumo: comunicacao.resumo })
        .from(comunicacao)
        .where(
          and(
            eq(comunicacao.escritorioId, escritorioId),
            eq(comunicacao.processoId, proc.id),
            or(
              isNull(comunicacao.conteudoCompleto),
              sql`${comunicacao.conteudoCompleto} <> ''`,
            ),
          ),
        )
        .limit(5);

      let novoNome: string | null = null;
      for (const com of coms) {
        const extraido = extrairAutorDoTexto(com.texto ?? com.resumo);
        if (extraido) {
          novoNome = extraido;
          break;
        }
      }

      await this.drizzle.db
        .update(processo)
        .set({ clienteNome: novoNome })
        .where(eq(processo.id, proc.id));

      if (novoNome) {
        corrigidos++;
      } else {
        zerados++;
      }
    }

    return { total: processosDjen.length, corrigidos, zerados, semMudanca };
  }

  async listarPorProcesso(escritorioId: string, processoId: string) {
    return this.drizzle.db
      .select()
      .from(comunicacao)
      .where(
        and(
          eq(comunicacao.escritorioId, escritorioId),
          eq(comunicacao.processoId, processoId),
        ),
      )
      .orderBy(desc(comunicacao.createdAt));
  }

  async listarOrfas(escritorioId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const where = and(
      eq(comunicacao.escritorioId, escritorioId),
      eq(comunicacao.status, 'ORFA'),
    );

    const [totalRow] = await this.drizzle.db
      .select({ c: count() })
      .from(comunicacao)
      .where(where);

    const data = await this.drizzle.db
      .select()
      .from(comunicacao)
      .where(where)
      .orderBy(desc(comunicacao.createdAt))
      .limit(pageSize)
      .offset(offset);

    const total = totalRow?.c ?? 0;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async cadastrarOab(escritorioId: string, dto: CadastrarOabDto) {
    const oab = dto.oab.trim().toUpperCase();
    const [existing] = await this.drizzle.db
      .select()
      .from(oabEscuta)
      .where(
        and(eq(oabEscuta.escritorioId, escritorioId), eq(oabEscuta.oab, oab)),
      )
      .limit(1);
    if (existing) {
      return existing;
    }
    const [row] = await this.drizzle.db
      .insert(oabEscuta)
      .values({ escritorioId, oab })
      .returning();
    return row;
  }

  async listarOabs(escritorioId: string) {
    return this.drizzle.db
      .select()
      .from(oabEscuta)
      .where(eq(oabEscuta.escritorioId, escritorioId))
      .orderBy(oabEscuta.oab);
  }

  async resolver(
    escritorioId: string,
    comunicacaoId: string,
    dto: ResolverComunicacaoDto,
  ) {
    const [row] = await this.drizzle.db
      .select()
      .from(comunicacao)
      .where(
        and(
          eq(comunicacao.id, comunicacaoId),
          eq(comunicacao.escritorioId, escritorioId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Comunicação não encontrada.');
    }

    if (dto.decisao === 'NAO_E_NOSSO') {
      const [updated] = await this.drizzle.db
        .update(comunicacao)
        .set({ status: 'DESCARTADA', processoId: null })
        .where(eq(comunicacao.id, comunicacaoId))
        .returning();
      return updated;
    }

    if (dto.decisao === 'ERRO') {
      const [updated] = await this.drizzle.db
        .update(comunicacao)
        .set({ status: 'ERRO', processoId: null })
        .where(eq(comunicacao.id, comunicacaoId))
        .returning();
      return updated;
    }

    let processoId = dto.processoId?.trim() || null;

    if (!processoId && dto.dadosNovoProcesso) {
      const novo = await this.processos.criarManual(
        escritorioId,
        dto.dadosNovoProcesso,
      );
      processoId = novo.id;
    }

    if (!processoId && row.numeroProcessoBruto) {
      processoId = await this.resolverProcessoId(escritorioId, row.numeroProcessoBruto);
    }

    if (!processoId) {
      throw new BadRequestException(
        'Informe processoId ou dadosNovoProcesso para vincular.',
      );
    }

    const [proc] = await this.drizzle.db
      .select({ id: processo.id })
      .from(processo)
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      )
      .limit(1);

    if (!proc) {
      throw new NotFoundException('Processo não encontrado.');
    }

    const [updated] = await this.drizzle.db
      .update(comunicacao)
      .set({ processoId, status: 'NAO_LIDA' })
      .where(eq(comunicacao.id, comunicacaoId))
      .returning();

    await this.aplicarRegras(escritorioId, updated, updated.tipo);

    return updated;
  }

  async patchStatus(
    escritorioId: string,
    id: string,
    status: 'LIDA' | 'NAO_LIDA',
  ) {
    const [updated] = await this.drizzle.db
      .update(comunicacao)
      .set({ status })
      .where(
        and(
          eq(comunicacao.id, id),
          eq(comunicacao.escritorioId, escritorioId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('Comunicação não encontrada.');
    return updated;
  }
}
