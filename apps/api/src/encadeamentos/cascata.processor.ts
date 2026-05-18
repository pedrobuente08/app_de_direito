import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EncadeamentosService } from './encadeamentos.service';
import type { CascataJobPayload } from './encadeamentos.types';

@Processor('cascata')
export class CascataProcessor extends WorkerHost {
  private readonly log = new Logger(CascataProcessor.name);

  constructor(private readonly encadeamentos: EncadeamentosService) {
    super();
  }

  override async process(job: Job<CascataJobPayload>) {
    const { escritorioId, evento, processoId, observacao } = job.data;
    const res = await this.encadeamentos.executar(escritorioId, evento, {
      processoId,
      observacao,
    });
    this.log.log(
      `Cascata ${evento} processo=${processoId} criadas=${res.criadas}`,
    );
    return res;
  }
}
