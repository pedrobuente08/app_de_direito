import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { OnboardingService } from './onboarding.service';
import type { OnboardingJobPayload } from './onboarding.types';

@Processor('onboarding')
export class OnboardingProcessor extends WorkerHost {
  private readonly log = new Logger(OnboardingProcessor.name);

  constructor(private readonly onboarding: OnboardingService) {
    super();
  }

  override async process(job: Job<OnboardingJobPayload>) {
    const rel = await this.onboarding.executar(job.data);
    this.log.log(
      `Onboarding job ${job.id} escritorio=${job.data.escritorioId} processos=${rel.processosNovos} comms=${rel.comunicacoesNovas}`,
    );
    return rel;
  }
}
