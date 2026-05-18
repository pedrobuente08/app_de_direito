import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { EncadeamentosService } from './encadeamentos.service';
import type { CascataJobPayload, EncadeamentoEvento } from './encadeamentos.types';

@Injectable()
export class EncadeamentosQueueService {
  private readonly log = new Logger(EncadeamentosQueueService.name);

  constructor(
    private readonly encadeamentos: EncadeamentosService,
    @Optional() @InjectQueue('cascata') private readonly queue?: Queue<CascataJobPayload>,
  ) {}

  async dispatch(
    escritorioId: string,
    evento: EncadeamentoEvento,
    opts: { processoId: string; observacao?: string | null },
  ): Promise<void> {
    const payload: CascataJobPayload = {
      escritorioId,
      evento,
      processoId: opts.processoId,
      observacao: opts.observacao ?? null,
    };

    if (this.queue) {
      await this.queue.add(evento, payload, {
        jobId: `${evento}:${opts.processoId}:${Date.now()}`,
      });
      return;
    }

    this.log.debug(`Redis indisponível — cascata ${evento} síncrona`);
    await this.encadeamentos.executar(escritorioId, evento, opts);
  }
}
