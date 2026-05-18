import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { JobsModule } from '../jobs/jobs.module';
import { ProcessosModule } from '../processos/processos.module';
import { PdfExtractProcessor } from './pdf-extract.processor';
import { RetentionService } from './retention.service';

const redisUrl = process.env.REDIS_URL?.trim();

@Module({
  imports: [
    forwardRef(() => ProcessosModule),
    EncadeamentosModule,
    JobsModule,
    ...(redisUrl ? [BullModule.registerQueue({ name: 'pdf-extract' })] : []),
  ],
  providers: [
    RetentionService,
    ...(redisUrl ? [PdfExtractProcessor] : []),
  ],
})
export class WorkersModule {}
