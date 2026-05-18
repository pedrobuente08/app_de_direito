import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { ProcessosModule } from '../processos/processos.module';
import { SentencasController } from './sentencas.controller';
import { SentencasService } from './sentencas.service';

@Module({
  imports: [ProcessosModule, EncadeamentosModule],
  controllers: [SentencasController],
  providers: [SentencasService],
})
export class SentencasModule {}
