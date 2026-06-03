import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { ComunicacoesService } from '../comunicacoes/comunicacoes.service';
import { CapturaService } from '../captura/captura.service';
import { ComunicaApiClient } from '../captura/comunica-api.client';
import { addDays, isoDate } from '../captura/captura.utils';
import { DrizzleService } from '../db/drizzle.service';
import { capturasLog } from '../db/schema/capturas-log';
import type { IniciarOnboardingDto } from './dto/iniciar-onboarding.dto';
import type {
  OnboardingJobPayload,
  OnboardingRelatorio,
  OnboardingStatusView,
} from './onboarding.types';

const FONTE_ONBOARDING = 'onboarding';

@Injectable()
export class OnboardingService {
  private readonly log = new Logger(OnboardingService.name);
  private readonly estado = new Map<string, OnboardingStatusView>();

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly comunicaApi: ComunicaApiClient,
    private readonly comunicacoes: ComunicacoesService,
    private readonly captura: CapturaService,
    @Optional()
    @InjectQueue('onboarding')
    private readonly bullQueue?: Queue<OnboardingJobPayload>,
  ) {}

  obterStatus(escritorioId: string): OnboardingStatusView {
    return (
      this.estado.get(escritorioId) ?? {
        status: 'IDLE',
        progresso: { processado: 0, total: 0 },
        relatorio: null,
      }
    );
  }

  private assertNaoRodando(escritorioId: string) {
    const cur = this.estado.get(escritorioId);
    if (cur?.status === 'RUNNING') {
      throw new ConflictException(
        'Já existe uma importação DJEN em andamento para este escritório.',
      );
    }
  }

  async iniciar(
    escritorioId: string,
    dto: IniciarOnboardingDto,
  ): Promise<{ jobId: string; status: OnboardingStatusView }> {
    this.assertNaoRodando(escritorioId);

    const numero = dto.oab.replace(/\D/g, '');
    const uf = dto.ufOab.trim().toUpperCase();
    if (!numero || uf.length !== 2) {
      throw new BadRequestException('Informe OAB e UF válidos.');
    }

    const oabNorm = `${numero}/${uf}`;
    const diasJanela = dto.diasJanela ?? 365;
    const log = await this.captura.criarLogInicio(escritorioId, oabNorm, FONTE_ONBOARDING);

    const payload: OnboardingJobPayload = {
      escritorioId,
      oab: numero,
      ufOab: uf,
      diasJanela,
      capturaLogId: log.id,
    };

    this.estado.set(escritorioId, {
      status: 'RUNNING',
      progresso: { processado: 0, total: 0 },
      relatorio: null,
    });

    if (this.bullQueue) {
      await this.bullQueue.add(`onboarding:${escritorioId}`, payload, {
        jobId: `onboarding-${escritorioId}`,
      });
    } else {
      void this.executar(payload).catch(() => {
        /* estado ERROR em executar */
      });
    }

    return { jobId: log.id, status: this.obterStatus(escritorioId) };
  }

  async executar(payload: OnboardingJobPayload): Promise<OnboardingRelatorio> {
    const { escritorioId, oab, ufOab, diasJanela, capturaLogId } = payload;
    const oabNorm = `${oab}/${ufOab}`;

    const hoje = new Date();
    const dataInicio = isoDate(addDays(hoje, -diasJanela));
    const dataFim = isoDate(hoje);

    const relatorio: OnboardingRelatorio = {
      processosNovos: 0,
      comunicacoesNovas: 0,
      jaExistiam: 0,
      erros: 0,
    };

    let status: 'ok' | 'falha' = 'ok';
    let erroMsg: string | undefined;
    let totalItems = 0;

    try {
      const items = await this.comunicaApi.consultarPorOabTodasPaginas({
        numeroOab: oab,
        ufOab,
        dataInicio,
        dataFim,
        itensPorPagina: 100,
      });

      totalItems = items.length;
      this.estado.set(escritorioId, {
        status: 'RUNNING',
        progresso: { processado: 0, total: totalItems },
        relatorio: null,
      });

      let processado = 0;
      for (const item of items) {
        if (item.ativo === false) {
          processado += 1;
          continue;
        }
        try {
          const res = await this.comunicacoes.ingestFromCaptura(
            escritorioId,
            oabNorm,
            item,
            { origemCriacao: 'ONBOARDING' },
          );
          if (res.nova) {
            relatorio.comunicacoesNovas += 1;
            if (res.processoCriado) relatorio.processosNovos += 1;
          } else {
            relatorio.jaExistiam += 1;
          }
        } catch {
          relatorio.erros += 1;
        }
        processado += 1;
        this.estado.set(escritorioId, {
          status: 'RUNNING',
          progresso: { processado, total: totalItems },
          relatorio: null,
        });
      }

      this.log.log(
        `Onboarding OK escritorio=${escritorioId} total=${totalItems} novos_proc=${relatorio.processosNovos} novas_comm=${relatorio.comunicacoesNovas}`,
      );
    } catch (err) {
      status = 'falha';
      erroMsg = err instanceof Error ? err.message : String(err);
      this.log.error(`Onboarding falhou escritorio=${escritorioId}: ${erroMsg}`);
      this.estado.set(escritorioId, {
        status: 'ERROR',
        progresso: { processado: 0, total: totalItems },
        relatorio,
        erroMsg,
      });
    }

    await this.drizzle.db
      .update(capturasLog)
      .set({
        concluidoEm: new Date(),
        status,
        totalItems,
        novosItems: relatorio.comunicacoesNovas,
        orfasGeradas: 0,
        erroMsg: erroMsg ?? null,
      })
      .where(eq(capturasLog.id, capturaLogId));

    if (status === 'ok') {
      this.estado.set(escritorioId, {
        status: 'DONE',
        progresso: { processado: totalItems, total: totalItems },
        relatorio,
      });
    }

    return relatorio;
  }
}
