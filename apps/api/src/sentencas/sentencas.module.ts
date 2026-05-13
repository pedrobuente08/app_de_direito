import { Module } from '@nestjs/common';
import { ProcessosModule } from '../processos/processos.module';
import { SentencasController } from './sentencas.controller';
import { SentencasService } from './sentencas.service';

@Module({
  imports: [ProcessosModule],
  controllers: [SentencasController],
  providers: [SentencasService],
})
export class SentencasModule {}
