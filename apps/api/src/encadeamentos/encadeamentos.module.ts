import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PendenciasModule } from '../pendencias/pendencias.module';
import { CalcularPrazoProcessualService } from './calcular-prazo-processual.service';
import { CascataProcessor } from './cascata.processor';
import { EncadeamentosQueueService } from './encadeamentos-queue.service';
import { EncadeamentosService } from './encadeamentos.service';

const redisUrl = process.env.REDIS_URL?.trim();

@Module({
  imports: [
    PendenciasModule,
    ...(redisUrl ? [BullModule.registerQueue({ name: 'cascata' })] : []),
  ],
  providers: [
    CalcularPrazoProcessualService,
    EncadeamentosService,
    EncadeamentosQueueService,
    ...(redisUrl ? [CascataProcessor] : []),
  ],
  exports: [
    EncadeamentosService,
    EncadeamentosQueueService,
    CalcularPrazoProcessualService,
  ],
})
export class EncadeamentosModule {}
