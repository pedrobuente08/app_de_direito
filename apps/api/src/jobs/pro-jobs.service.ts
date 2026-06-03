import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { escritorio } from '../db/schema/escritorio';
import { processo } from '../db/schema/processo';
import { processoProcedente } from '../db/schema/processo-procedente';
import { tutelaAntecipada } from '../db/schema/tutela-antecipada';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysYmd(base: string, days: number): string {
  const d = new Date(`${base.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ProJobsService {
  private readonly log = new Logger(ProJobsService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  private async escritorios() {
    return this.drizzle.db.select({ id: escritorio.id }).from(escritorio);
  }

  /** [11.1] Atualiza total acumulado de astreintes — 06:00 diário. */
  @Cron('0 6 * * *')
  async jobAtualizarAstreintes() {
    const hoje = hojeYmd();
    for (const { id: escritorioId } of await this.escritorios()) {
      const rows = await this.drizzle.db
        .select()
        .from(processoProcedente)
        .where(
          and(
            eq(processoProcedente.escritorioId, escritorioId),
            eq(processoProcedente.astreintesAtiva, true),
            isNull(processoProcedente.astreintesPagaEm),
          ),
        );

      for (const pp of rows) {
        if (!pp.astreintesDataInicio || !pp.astreintesValorDiario) continue;
        const inicio = pp.astreintesDataInicio;
        const dias = Math.max(
          0,
          Math.floor(
            (new Date(`${hoje}T12:00:00`).getTime() -
              new Date(`${inicio}T12:00:00`).getTime()) /
              86400000,
          ),
        );
        let total = dias * Number(pp.astreintesValorDiario);
        if (pp.astreintesTeto) {
          total = Math.min(total, Number(pp.astreintesTeto));
          if (total > Number(pp.astreintesTeto) * 0.8) {
            await this.notificacoes.criar({
              escritorioId,
              fila: 'ADV',
              tipoGatilho: 'astreintes_teto_proximo',
              entidade: 'processo',
              entidadeId: pp.processoId,
              titulo: 'Astreintes — teto próximo',
              mensagem: `Processo ${pp.processoId.slice(0, 8)}… acumulou ${total.toFixed(2)} (≥80% do teto).`,
              prioridade: 'ALTA',
            });
          }
        }
        await this.drizzle.db
          .update(processoProcedente)
          .set({
            astreintesTotalAcumulado: String(total.toFixed(2)),
            astreintesUltimaAtualizacao: hoje,
            updatedAt: new Date(),
          })
          .where(eq(processoProcedente.processoId, pp.processoId));
      }
    }
    this.log.debug('jobAtualizarAstreintes concluído');
  }

  /** [9.1] Tutelas vencendo em 7 dias — segunda 08:00. */
  @Cron('0 8 * * 1')
  async jobRevisarTutelas() {
    const limite = addDaysYmd(hojeYmd(), 7);
    for (const { id: escritorioId } of await this.escritorios()) {
      const rows = await this.drizzle.db
        .select()
        .from(tutelaAntecipada)
        .where(
          and(
            eq(tutelaAntecipada.escritorioId, escritorioId),
            eq(tutelaAntecipada.cumprida, false),
            lte(tutelaAntecipada.prazoCumprimento, limite),
          ),
        );
      for (const t of rows) {
        await this.notificacoes.criar({
          escritorioId,
          fila: 'ADV',
          tipoGatilho: 'tutela_vencendo',
          entidade: 'processo',
          entidadeId: t.processoId,
          titulo: 'Tutela — prazo vencendo',
          mensagem: `Prazo de cumprimento ${t.prazoCumprimento ?? '—'} — revisar tutela.`,
          prioridade: 'ALTA',
        });
      }
    }
  }

  /** [9.3] Sobrestados há 6+ meses sem revisão — dia 1, 09:00. */
  @Cron('0 9 1 * *')
  async jobRevisarSobrestados() {
    for (const { id: escritorioId } of await this.escritorios()) {
      const rows = await this.drizzle.db
        .select({
          id: processo.id,
          numero: processo.numero,
          sobrestadoDesde: processo.sobrestadoDesde,
        })
        .from(processo)
        .where(
          and(
            eq(processo.escritorioId, escritorioId),
            eq(processo.statusProcesso, 'SOBRESTADO'),
            isNull(processo.sobrestamentoRevisadoEm),
            sql`${processo.sobrestadoDesde} <= (current_date - interval '6 months')::date`,
          ),
        );
      for (const p of rows) {
        await this.notificacoes.criar({
          escritorioId,
          fila: 'ADV',
          tipoGatilho: 'sobrestamento_revisar',
          entidade: 'processo',
          entidadeId: p.id,
          titulo: 'Sobrestamento — revisar',
          mensagem: `Processo ${p.numero} sobrestado desde ${p.sobrestadoDesde ?? '—'} — revisar situação.`,
          prioridade: 'MEDIA',
        });
      }
    }
  }
}
