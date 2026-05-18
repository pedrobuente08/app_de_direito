import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { ProcessosModule } from '../processos/processos.module';
import { RecursosController } from './recursos.controller';
import { RecursosService } from './recursos.service';

@Module({
  imports: [ProcessosModule, EncadeamentosModule],
  controllers: [RecursosController],
  providers: [RecursosService],
})
export class RecursosModule {}
