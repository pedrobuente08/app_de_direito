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
import { PendenciasService } from '../pendencias/pendencias.service';
import { ProcessosService } from '../processos/processos.service';
import type { CadastrarOabDto } from './dto/cadastrar-oab.dto';
import type { ComunicacaoWebhookDto } from './dto/comunicacao-webhook.dto';
import type { ResolverComunicacaoDto } from './dto/resolver-comunicacao.dto';

function normNumero(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  return raw.replace(/\D/g, '') || null;
}

type ComunicaRegra = {
  acao?: string;
  criar_pendencia?: boolean;
  tipo_pendencia?: string;
  prazo_dias?: number;
  sincronizar_audiencia?: boolean;
  /** Tipo gravado na audiência (default: tipo da comunicação ou `COMUNICA`). */
  audiencia_tipo?: string;
  /** Hora `HH:mm` opcional. */
  audiencia_hora?: string;
};

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ComunicacoesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly pendencias: PendenciasService,
    private readonly audiencias: AudienciasService,
    private readonly processos: ProcessosService,
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
    if (!comRow.processoId || !tipoBruto?.trim()) {
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

    const key = tipoBruto.trim().toUpperCase();
    const rule = regras[key];
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
      const dataStr = comRow.dataDisponibilizacao
        ? comRow.dataDisponibilizacao.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const horaRaw = rule.audiencia_hora?.trim();
      const hora =
        horaRaw && /^([01]\d|2[0-3]):[0-5]\d$/.test(horaRaw) ? horaRaw : null;
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
          hora,
          status: 'AGENDADA',
          obsPre: comRow.resumo?.slice(0, 2000) ?? null,
        });
      } catch {
        /* duplicata processo+data ou validação */
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

  async registrarWebhook(dto: ComunicacaoWebhookDto) {
    await this.validarTokenEscritorio(dto.escritorioId, dto.token);

    const digits = normNumero(dto.numeroProcessoBruto ?? undefined);
    let processoId: string | null = null;
    if (digits) {
      const candidatos = await this.drizzle.db
        .select({ id: processo.id })
        .from(processo)
        .where(
          and(
            eq(processo.escritorioId, dto.escritorioId),
            sql`regexp_replace(${processo.numero}, '[^0-9]', '', 'g') = ${digits}`,
          ),
        )
        .limit(1);
      processoId = candidatos[0]?.id ?? null;
    }

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
      const digits = normNumero(row.numeroProcessoBruto);
      if (digits) {
        const [found] = await this.drizzle.db
          .select({ id: processo.id })
          .from(processo)
          .where(
            and(
              eq(processo.escritorioId, escritorioId),
              sql`regexp_replace(${processo.numero}, '[^0-9]', '', 'g') = ${digits}`,
            ),
          )
          .limit(1);
        processoId = found?.id ?? null;
      }
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
