import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { escritorio } from '../db/schema/escritorio';
import { improcedente } from '../db/schema/improcedente';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { processoProcedente } from '../db/schema/processo-procedente';
import { processoReprotocolo } from '../db/schema/processo-reprotocolo';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function horaBrasilia(): number {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === 'hour')?.value ?? '12');
}

function dentroHorarioComercial(): boolean {
  const h = horaBrasilia();
  return h >= 7 && h <= 19;
}

@Injectable()
export class AlertasJobsService {
  private readonly log = new Logger(AlertasJobsService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly notificacoes: NotificacoesService,
    private readonly encadeamentos: EncadeamentosQueueService,
  ) {}

  private async listarEscritorios() {
    return this.drizzle.db.select({ id: escritorio.id }).from(escritorio);
  }

  @Cron('0 * * * *')
  async jobAlertasPendencias() {
    if (!dentroHorarioComercial()) return;
    const hoje = hojeYmd();
    for (const { id: escritorioId } of await this.listarEscritorios()) {
      const rows = await this.drizzle.db
        .select({
          id: pendencia.id,
          tipo: pendencia.tipo,
          dataLimite: pendencia.dataLimite,
          processoId: pendencia.processoId,
        })
        .from(pendencia)
        .where(
          and(
            eq(pendencia.escritorioId, escritorioId),
            eq(pendencia.status, 'ABERTA'),
            isNotNull(pendencia.dataLimite),
            lte(pendencia.dataLimite, hoje),
          ),
        )
        .limit(50);

      for (const p of rows) {
        await this.notificacoes.criar({
          escritorioId,
          tipoGatilho: 'job_alertas_pendencias',
          entidade: 'pendencia',
          entidadeId: p.id,
          titulo: `Pendência vencida: ${p.tipo}`,
          mensagem: `Prazo ${p.dataLimite} — processo ${p.processoId.slice(0, 8)}…`,
          prioridade: 'ALTA',
        });
      }
    }
    this.log.debug('job_alertas_pendencias concluído');
  }

  @Cron('0 * * * *')
  async jobAlertasAvaliar() {
    if (!dentroHorarioComercial()) return;
    const hoje = hojeYmd();
    for (const { id: escritorioId } of await this.listarEscritorios()) {
      const rows = await this.drizzle.db
        .select({ id: processo.id, numero: processo.numero, av: processo.avaliacaoRecurso })
        .from(processo)
        .where(eq(processo.escritorioId, escritorioId))
        .limit(500);

      for (const row of rows) {
        const av = row.av as { ativa?: boolean; prazo?: string } | null;
        if (!av?.ativa || !av.prazo || av.prazo > hoje) continue;
        await this.notificacoes.criar({
          escritorioId,
          tipoGatilho: 'job_alertas_avaliar',
          entidade: 'processo',
          entidadeId: row.id,
          titulo: `AVALIAR vencendo: ${row.numero}`,
          mensagem: `Prazo de avaliação de recurso em ${av.prazo}.`,
          prioridade: 'ALTA',
        });
      }
    }
    this.log.debug('job_alertas_avaliar concluído');
  }

  @Cron('15 * * * *')
  async jobAlertasRecurso10d() {
    const limite = new Date();
    limite.setDate(limite.getDate() + 10);
    const ate = limite.toISOString().slice(0, 10);

    for (const { id: escritorioId } of await this.listarEscritorios()) {
      const rows = await this.drizzle.db
        .select({
          processoId: pendencia.processoId,
          tipo: pendencia.tipo,
          dataLimite: pendencia.dataLimite,
        })
        .from(pendencia)
        .where(
          and(
            eq(pendencia.escritorioId, escritorioId),
            eq(pendencia.status, 'ABERTA'),
            sql`upper(${pendencia.tipo}) like '%RECURSO%'`,
            isNotNull(pendencia.dataLimite),
            lte(pendencia.dataLimite, ate),
          ),
        )
        .limit(40);

      for (const p of rows) {
        await this.notificacoes.criar({
          escritorioId,
          tipoGatilho: 'job_alertas_recurso_10d',
          entidade: 'pendencia',
          entidadeId: p.processoId,
          titulo: 'Recurso — prazo em até 10 dias',
          mensagem: `${p.tipo} vence em ${p.dataLimite}`,
          prioridade: 'MEDIA',
        });
      }
    }
  }

  @Cron('0 8 * * *')
  async jobAlertasSucumbencia() {
    const hoje = hojeYmd();
    const em15 = new Date();
    em15.setDate(em15.getDate() + 15);
    const limite15 = em15.toISOString().slice(0, 10);

    for (const { id: escritorioId } of await this.listarEscritorios()) {
      const rows = await this.drizzle.db
        .select({
          processoId: improcedente.processoId,
          valor: improcedente.valorSucumbencia,
          prazo: improcedente.dataPrazoPagamento,
        })
        .from(improcedente)
        .where(
          and(
            eq(improcedente.escritorioId, escritorioId),
            eq(improcedente.statusPagamento, 'A_PAGAR'),
            isNotNull(improcedente.dataPrazoPagamento),
            lte(improcedente.dataPrazoPagamento, limite15),
          ),
        )
        .limit(40);

      for (const r of rows) {
        const vencida = (r.prazo ?? '') <= hoje;
        await this.notificacoes.criar({
          escritorioId,
          tipoGatilho: 'job_alertas_sucumbencia',
          entidade: 'processo',
          entidadeId: r.processoId,
          titulo: vencida
            ? 'Sucumbência vencida'
            : 'Sucumbência vence em 15 dias',
          mensagem: `Valor ${r.valor ?? '—'} · prazo ${r.prazo}`,
          prioridade: vencida ? 'ALTA' : 'MEDIA',
          enviarEmail: true,
        });
      }
    }
  }

  /** AGUARDAR_PAGTO com prazo estimado vencido → cascata de cumprimento de sentença. */
  @Cron('0 7 * * *')
  async jobPagamentoVoluntarioExpirado() {
    const hoje = hojeYmd();
    for (const { id: escritorioId } of await this.listarEscritorios()) {
      const rows = await this.drizzle.db
        .select({
          processoId: processoProcedente.processoId,
        })
        .from(processoProcedente)
        .where(
          and(
            eq(processoProcedente.escritorioId, escritorioId),
            eq(processoProcedente.familiaSituacao, 'AGUARDAR_PAGTO'),
            isNotNull(processoProcedente.dataEstimadaRecebimento),
            lte(processoProcedente.dataEstimadaRecebimento, hoje),
            isNull(processoProcedente.valorRecebido),
          ),
        )
        .limit(30);

      for (const r of rows) {
        await this.encadeamentos.dispatch(
          escritorioId,
          'pagamento_voluntario_expirado',
          { processoId: r.processoId },
        );
      }
    }
    this.log.debug('job_pagamento_voluntario_expirado concluído');
  }

  @Cron('0 6 * * 1')
  async jobRevisitaReprotocolo() {
    for (const { id: escritorioId } of await this.listarEscritorios()) {
      const [row] = await this.drizzle.db
        .select({ n: sql<number>`count(*)::int` })
        .from(processoReprotocolo)
        .where(
          and(
            eq(processoReprotocolo.escritorioId, escritorioId),
            or(
              eq(processoReprotocolo.subEstado, 'AGUARDANDO_ANALISE'),
              eq(processoReprotocolo.subEstado, 'AGUARDANDO_DOC_CLIENTE'),
            ),
          ),
        );
      const total = row?.n ?? 0;
      if (total === 0) continue;
      await this.notificacoes.criar({
        escritorioId,
        tipoGatilho: 'job_revisita_reprotocolo',
        titulo: 'Reprotocolo — itens a revisitar',
        mensagem: `${total} processo(s) aguardando análise ou documentação.`,
        prioridade: 'MEDIA',
      });
    }
  }

  @Cron('30 3 * * *')
  async jobDescartaOrfas() {
    try {
      const res = await this.drizzle.db.execute(sql`
        delete from comunicacao
        where status = 'ORFA'
          and created_at < now() - interval '90 days'
      `);
      this.log.log(`job_descarta_orfas: ${JSON.stringify(res)}`);
    } catch (e) {
      this.log.error((e as Error).message);
    }
  }

  @Cron('0 3 * * *')
  async jobLimpezaHistorico() {
    try {
      await this.drizzle.db.execute(sql`
        delete from pendencia_historico
        where archived_at < now() - interval '60 days'
      `);
      this.log.log('job_limpeza_historico concluído');
    } catch (e) {
      this.log.error((e as Error).message);
    }
  }
}
