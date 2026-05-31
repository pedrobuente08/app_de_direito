import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { escritorio } from '../db/schema/escritorio';
import { comunicacao } from '../db/schema/comunicacao';
import { oabEscuta } from '../db/schema/oab-escuta';
import { processo } from '../db/schema/processo';
import { DrizzleService } from '../db/drizzle.service';
import { AudienciasService } from '../audiencias/audiencias.service';
import { FaseDerivacaoService } from '../fase-derivacao/fase-derivacao.service';
import { PendenciasService } from '../pendencias/pendencias.service';
import { ProcessosService } from '../processos/processos.service';
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
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly pendencias: PendenciasService,
    private readonly audiencias: AudienciasService,
    private readonly processos: ProcessosService,
    private readonly faseDerivacao: FaseDerivacaoService,
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

    if (rule.criar_pendencia && rule.tipo_pendencia?.trim()) {
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
      } catch {
        /* duplicata / conflito: não quebra webhook */
      }
    }

    if (rule.sincronizar_audiencia) {
      const { data: dataExtraida, hora: horaExtraida } = extrairDataHoraDeResumo(comRow.resumo);
      // Fallback para data de disponibilização se o texto não trouxer data explícita
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
      } catch {
        /* duplicata processo+data ou validação */
      }
    }

    if (rule.avancar_fase?.trim()) {
      try {
        await this.faseDerivacao.forcarFase(
          escritorioId,
          comRow.processoId,
          rule.avancar_fase.trim(),
        );
      } catch {
        /* não interrompe o fluxo se a transição falhar */
      }
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

  private async resolverProcessoId(
    escritorioId: string,
    numeroProcessoBruto: string | null | undefined,
  ): Promise<string | null> {
    const digits = normNumero(numeroProcessoBruto ?? undefined);
    if (!digits) return null;
    const candidatos = await this.drizzle.db
      .select({ id: processo.id })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          sql`regexp_replace(${processo.numero}, '[^0-9]', '', 'g') = ${digits}`,
        ),
      )
      .limit(1);
    return candidatos[0]?.id ?? null;
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
  ): Promise<{ nova: boolean; comunicacaoId?: string }> {
    if (!item.hash?.trim()) {
      return { nova: false };
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
      return { nova: false, comunicacaoId: existing.id };
    }

    const numeroProcessoBruto =
      item.numeroprocessocommascara?.trim() ||
      item.numero_processo?.trim() ||
      null;
    const processoId = await this.resolverProcessoId(escritorioId, numeroProcessoBruto);
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
        status: processoId ? 'LIDA' : 'ORFA',
      })
      .returning();

    if (row) {
      await this.aplicarRegras(escritorioId, row, tipo);
      return { nova: true, comunicacaoId: row.id };
    }

    return { nova: false };
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
        status: processoId ? 'LIDA' : 'ORFA',
      })
      .returning();

    if (row) {
      await this.aplicarRegras(dto.escritorioId, row, dto.tipo);
    }

    return row;
  }

  async listar(escritorioId: string, limit = 200) {
    return this.drizzle.db
      .select()
      .from(comunicacao)
      .where(eq(comunicacao.escritorioId, escritorioId))
      .orderBy(desc(comunicacao.createdAt))
      .limit(limit);
  }

  async listarOrfas(escritorioId: string) {
    return this.drizzle.db
      .select()
      .from(comunicacao)
      .where(
        and(
          eq(comunicacao.escritorioId, escritorioId),
          eq(comunicacao.status, 'ORFA'),
        ),
      )
      .orderBy(desc(comunicacao.createdAt))
      .limit(100);
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
      .set({ processoId, status: 'LIDA' })
      .where(eq(comunicacao.id, comunicacaoId))
      .returning();

    await this.aplicarRegras(escritorioId, updated, updated.tipo);

    return updated;
  }
}
