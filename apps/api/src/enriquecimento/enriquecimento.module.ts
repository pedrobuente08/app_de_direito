import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ComunicaApiClient } from '../captura/comunica-api.client';
import { EnriquecimentoController } from './enriquecimento.controller';
import { EnriquecimentoProcessor } from './enriquecimento.processor';
import { EnriquecimentoQueueService, ENRIQUECIMENTO_QUEUE } from './enriquecimento-queue.service';
import { EnriquecimentoService } from './enriquecimento.service';

const redisUrl = process.env.REDIS_URL?.trim();

@Module({
  imports: [
    ...(redisUrl ? [BullModule.registerQueue({ name: ENRIQUECIMENTO_QUEUE })] : []),
  ],
  controllers: [EnriquecimentoController],
  providers: [
    ComunicaApiClient,
    EnriquecimentoService,
    EnriquecimentoQueueService,
    ...(redisUrl ? [EnriquecimentoProcessor] : []),
  ],
  exports: [EnriquecimentoQueueService],
})
export class EnriquecimentoModule {}
