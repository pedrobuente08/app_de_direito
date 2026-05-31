import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { ComunicacoesService } from '../comunicacoes/comunicacoes.service';
import { DrizzleService } from '../db/drizzle.service';
import { capturasLog } from '../db/schema/capturas-log';
import { comunicacao } from '../db/schema/comunicacao';
import { fontesSaude } from '../db/schema/fontes-saude';
import { oabEscuta } from '../db/schema/oab-escuta';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { ComunicaApiClient } from './comunica-api.client';
import type {
  CapturaAlerta,
  CapturaJobPayload,
  CapturaResult,
  FonteSaudeView,
} from './captura.types';
import { addDays, isoDate, parseOab } from './captura.utils';

const FONTE_DJEN = 'djen';

@Injectable()
export class CapturaService {
  private readonly log = new Logger(CapturaService.name);
  private readonly diasJanela: number;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly comunicaApi: ComunicaApiClient,
    private readonly comunicacoes: ComunicacoesService,
    private readonly notificacoes: NotificacoesService,
    config: ConfigService,
  ) {
    this.diasJanela = Number(config.get('CAPTURA_DJEN_DIAS_JANELA') ?? 7);
  }

  async listarOabsDoEscritorio(escritorioId: string) {
    return this.drizzle.db
      .select()
      .from(oabEscuta)
      .where(eq(oabEscuta.escritorioId, escritorioId));
  }

  async listarOabsEscuta() {
    return this.drizzle.db.select().from(oabEscuta);
  }

  async criarLogInicio(
    escritorioId: string,
    oab: string,
    fonte: string = FONTE_DJEN,
  ) {
    const [row] = await this.drizzle.db
      .insert(capturasLog)
      .values({
        escritorioId,
        oab: oab.trim().toUpperCase(),
        fonte,
        iniciadoEm: new Date(),
        status: 'parcial',
      })
      .returning();
    return row!;
  }

  async capturarPorOab(
    escritorioId: string,
    oab: string,
    opts?: { capturaLogId?: string; tentativa?: 'normal' },
  ): Promise<CapturaResult> {
    const oabNorm = oab.trim().toUpperCase();
    const parsed = parseOab(oabNorm);
    if (!parsed) {
      throw new Error(`OAB inválida para captura: ${oab}`);
    }

    let logId = opts?.capturaLogId;
    if (!logId) {
      const log = await this.criarLogInicio(escritorioId, oabNorm);
      logId = log.id;
    }

    const hoje = new Date();
    const dataInicio = isoDate(addDays(hoje, -this.diasJanela));
    const dataFim = isoDate(hoje);

    let totalItems = 0;
    let novosItems = 0;
    let erroMsg: string | undefined;
    let status: CapturaResult['status'] = 'ok';

    try {
      const items = await this.comunicaApi.consultarPorOabTodasPaginas({
        numeroOab: parsed.numero,
        ufOab: parsed.uf,
        dataInicio,
        dataFim,
        itensPorPagina: 100,
      });

      totalItems = items.length;

      for (const item of items) {
        if (item.ativo === false) continue;
        const { nova } = await this.comunicacoes.ingestFromCaptura(
          escritorioId,
          oabNorm,
          item,
        );
        if (nova) novosItems += 1;
      }

      await this.registrarSucessoFonte(escritorioId, FONTE_DJEN);
    } catch (err) {
      status = 'falha';
      erroMsg = err instanceof Error ? err.message : String(err);
      await this.registrarFalhaFonte(escritorioId, FONTE_DJEN, erroMsg);
      await this.notificarFalha(escritorioId, oabNorm, erroMsg);
      this.log.error(`Captura falhou escritorio=${escritorioId} oab=${oabNorm}: ${erroMsg}`);
    }

    await this.drizzle.db
      .update(capturasLog)
      .set({
        concluidoEm: new Date(),
        status,
        totalItems,
        novosItems,
        erroMsg: erroMsg ?? null,
      })
      .where(eq(capturasLog.id, logId));

    return { capturaLogId: logId, status, totalItems, novosItems, erroMsg };
  }

  async processarJob(payload: CapturaJobPayload): Promise<CapturaResult> {
    return this.capturarPorOab(payload.escritorioId, payload.oab, {
      capturaLogId: payload.capturaLogId,
      tentativa: payload.tentativa,
    });
  }

  async registrarInicioAgendado(escritorioId: string, fonte = FONTE_DJEN) {
    const now = new Date();
    await this.drizzle.db
      .insert(fontesSaude)
      .values({
        fonte,
        escritorioId,
        falhasConsecutivas: 0,
      })
      .onConflictDoNothing();
  }

  private async registrarSucessoFonte(escritorioId: string, fonte: string) {
    const now = new Date();
    await this.drizzle.db
      .insert(fontesSaude)
      .values({
        fonte,
        escritorioId,
        ultimoOkEm: now,
        falhasConsecutivas: 0,
      })
      .onConflictDoUpdate({
        target: [fontesSaude.fonte, fontesSaude.escritorioId],
        set: {
          ultimoOkEm: now,
          falhasConsecutivas: 0,
        },
      });
  }

  private async registrarFalhaFonte(
    escritorioId: string,
    fonte: string,
    erroMsg: string,
  ) {
    const now = new Date();
    await this.drizzle.db
      .insert(fontesSaude)
      .values({
        fonte,
        escritorioId,
        ultimaFalhaEm: now,
        falhasConsecutivas: 1,
      })
      .onConflictDoUpdate({
        target: [fontesSaude.fonte, fontesSaude.escritorioId],
        set: {
          ultimaFalhaEm: now,
          falhasConsecutivas: sql`${fontesSaude.falhasConsecutivas} + 1`,
        },
      });
  }

  private async notificarFalha(
    escritorioId: string,
    oab: string,
    erroMsg: string,
  ) {
    try {
      await this.notificacoes.criar({
        escritorioId,
        tipoGatilho: 'CAPTURA_DJEN_FALHA',
        entidade: 'captura',
        titulo: `Falha na captura DJEN`,
        mensagem: `A captura da OAB ${oab} falhou: ${erroMsg.slice(0, 500)}`,
        prioridade: 'ALTA',
      });
    } catch (e) {
      this.log.warn(`Não foi possível criar notificação de falha: ${e}`);
    }
  }

  async listarSaude(escritorioId: string): Promise<FonteSaudeView[]> {
    const rows = await this.drizzle.db
      .select()
      .from(fontesSaude)
      .where(eq(fontesSaude.escritorioId, escritorioId));

    return rows.map((r) => ({
      fonte: r.fonte,
      ultimoOkEm: r.ultimoOkEm?.toISOString() ?? null,
      ultimaFalhaEm: r.ultimaFalhaEm?.toISOString() ?? null,
      falhasConsecutivas: r.falhasConsecutivas,
      saudavel: r.falhasConsecutivas === 0,
    }));
  }

  async listarLogs(escritorioId: string, limit = 20) {
    return this.drizzle.db
      .select()
      .from(capturasLog)
      .where(eq(capturasLog.escritorioId, escritorioId))
      .orderBy(desc(capturasLog.iniciadoEm))
      .limit(limit);
  }

  async obterAlerta(escritorioId: string): Promise<CapturaAlerta | null> {
    const [fonte] = await this.drizzle.db
      .select()
      .from(fontesSaude)
      .where(
        and(
          eq(fontesSaude.escritorioId, escritorioId),
          eq(fontesSaude.fonte, FONTE_DJEN),
        ),
      )
      .limit(1);

    if (!fonte || fonte.falhasConsecutivas <= 0 || !fonte.ultimaFalhaEm) {
      return null;
    }

    const falhaRecente = Date.now() - fonte.ultimaFalhaEm.getTime() < 48 * 60 * 60 * 1000;
    if (!falhaRecente) return null;

    const [ultimaFalha] = await this.drizzle.db
      .select()
      .from(capturasLog)
      .where(
        and(
          eq(capturasLog.escritorioId, escritorioId),
          eq(capturasLog.fonte, FONTE_DJEN),
          eq(capturasLog.status, 'falha'),
        ),
      )
      .orderBy(desc(capturasLog.iniciadoEm))
      .limit(1);

    const tribunal = ultimaFalha?.erroMsg?.match(/TJ[A-Z]{2}|TRT\d+|TRF\d+/)?.[0] ?? 'DJEN';
    const orfas = await this.contarOrfasRecentes(escritorioId);

    return {
      ativo: true,
      fonte: FONTE_DJEN,
      falhasConsecutivas: fonte.falhasConsecutivas,
      ultimaFalhaEm: fonte.ultimaFalhaEm.toISOString(),
      titulo: `${tribunal} não respondeu na captura`,
      mensagem: `${tribunal} não respondeu na última captura automática. ${orfas > 0 ? `${orfas} processo(s) podem ter publicações pendentes` : 'Confira manualmente ou aguarde a próxima captura automática'}.`,
    };
  }

  private async contarOrfasRecentes(escritorioId: string): Promise<number> {
    const desde = addDays(new Date(), -3);
    const [row] = await this.drizzle.db
      .select({ total: sql<number>`count(*)::int` })
      .from(comunicacao)
      .where(
        and(
          eq(comunicacao.escritorioId, escritorioId),
          eq(comunicacao.status, 'ORFA'),
          gte(comunicacao.createdAt, desde),
        ),
      );
    return row?.total ?? 0;
  }
}
