import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { ProcessosModule } from '../processos/processos.module';
import { EmbargosController } from './embargos.controller';
import { EmbargosService } from './embargos.service';

@Module({
  imports: [ProcessosModule, EncadeamentosModule, EscritorioModule],
  controllers: [EmbargosController],
  providers: [EmbargosService],
  exports: [EmbargosService],
})
export class EmbargosModule {}
