import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CapturaService } from './captura.service';
import type { CapturaJobPayload } from './captura.types';

@Processor('captura')
export class CapturaProcessor extends WorkerHost {
  private readonly log = new Logger(CapturaProcessor.name);

  constructor(private readonly captura: CapturaService) {
    super();
  }

  override async process(job: Job<CapturaJobPayload>) {
    const res = await this.captura.processarJob(job.data);
    this.log.log(
      `Captura ${job.data.oab} escritorio=${job.data.escritorioId} status=${res.status} novos=${res.novosItems}/${res.totalItems}`,
    );
    return res;
  }
}
