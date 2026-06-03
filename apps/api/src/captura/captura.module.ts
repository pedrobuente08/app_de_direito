import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ComunicacoesModule } from '../comunicacoes/comunicacoes.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { CapturaController } from './captura.controller';
import { CapturaProcessor } from './captura.processor';
import { CapturaQueueService } from './captura-queue.service';
import { CapturaSchedulerService } from './captura.scheduler';
import { CapturaService } from './captura.service';
import { ComunicaApiClient } from './comunica-api.client';

const redisUrl = process.env.REDIS_URL?.trim();

@Module({
  imports: [
    ComunicacoesModule,
    NotificacoesModule,
    ...(redisUrl ? [BullModule.registerQueue({ name: 'captura' })] : []),
  ],
  controllers: [CapturaController],
  providers: [
    ComunicaApiClient,
    CapturaService,
    CapturaQueueService,
    CapturaSchedulerService,
    ...(redisUrl ? [CapturaProcessor] : []),
  ],
  exports: [CapturaService, ComunicaApiClient],
})
export class CapturaModule {}
