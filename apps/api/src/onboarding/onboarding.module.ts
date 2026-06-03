import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CapturaModule } from '../captura/captura.module';
import { ComunicacoesModule } from '../comunicacoes/comunicacoes.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingProcessor } from './onboarding.processor';
import { OnboardingService } from './onboarding.service';

const redisUrl = process.env.REDIS_URL?.trim();

@Module({
  imports: [
    ComunicacoesModule,
    CapturaModule,
    ...(redisUrl ? [BullModule.registerQueue({ name: 'onboarding' })] : []),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, ...(redisUrl ? [OnboardingProcessor] : [])],
})
export class OnboardingModule {}
