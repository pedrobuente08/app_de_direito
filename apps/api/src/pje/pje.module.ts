import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { ProcessosModule } from '../processos/processos.module';
import { PjeController } from './pje.controller';
import { PjeService } from './pje.service';

@Module({
  imports: [ProcessosModule, EncadeamentosModule, EscritorioModule],
  controllers: [PjeController],
  providers: [PjeService],
  exports: [PjeService],
})
export class PjeModule {}
