import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EnriquecimentoService } from './enriquecimento.service';
import { ENRIQUECIMENTO_QUEUE } from './enriquecimento-queue.service';
import type { EnriquecimentoJobPayload } from './enriquecimento.types';

@Processor(ENRIQUECIMENTO_QUEUE)
export class EnriquecimentoProcessor extends WorkerHost {
  private readonly log = new Logger(EnriquecimentoProcessor.name);

  constructor(private readonly enriquecimento: EnriquecimentoService) {
    super();
  }

  override async process(job: Job<EnriquecimentoJobPayload>) {
    this.log.debug(`Enriquecendo processo=${job.data.processoId}`);
    await this.enriquecimento.enriquecer(job.data);
  }
}
