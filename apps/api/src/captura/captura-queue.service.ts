import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { CapturaService } from './captura.service';
import type { CapturaJobPayload } from './captura.types';

@Injectable()
export class CapturaQueueService {
  private readonly log = new Logger(CapturaQueueService.name);

  constructor(
    private readonly captura: CapturaService,
    @Optional() @InjectQueue('captura') private readonly queue?: Queue<CapturaJobPayload>,
  ) {}

  async enfileirar(payload: CapturaJobPayload): Promise<void> {
    if (this.queue) {
      await this.queue.add(`captura:${payload.oab}`, payload, {
        jobId: `${payload.capturaLogId}`,
      });
      return;
    }

    this.log.debug(`Redis indisponível — captura síncrona OAB ${payload.oab}`);
    await this.captura.processarJob(payload);
  }
}
