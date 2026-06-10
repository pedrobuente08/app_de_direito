import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { EnriquecimentoService } from './enriquecimento.service';
import type { EnriquecimentoJobPayload } from './enriquecimento.types';

export const ENRIQUECIMENTO_QUEUE = 'enriquecimento-processo';

@Injectable()
export class EnriquecimentoQueueService {
  private readonly log = new Logger(EnriquecimentoQueueService.name);

  constructor(
    private readonly enriquecimento: EnriquecimentoService,
    @Optional()
    @InjectQueue(ENRIQUECIMENTO_QUEUE)
    private readonly queue?: Queue<EnriquecimentoJobPayload>,
  ) {}

  async enfileirar(payload: EnriquecimentoJobPayload): Promise<void> {
    if (this.queue) {
      await this.queue.add(`enriquecer:${payload.processoId}`, payload, {
        jobId: `enriquecimento:${payload.processoId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      });
      return;
    }

    this.log.debug(`Redis indisponível — enriquecimento síncrono processo=${payload.processoId}`);
    await this.enriquecimento.enriquecer(payload);
  }
}
