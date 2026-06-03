import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { FaseDerivacaoModule } from '../fase-derivacao/fase-derivacao.module';
import { ParceirosModule } from '../parceiros/parceiros.module';
import { ProcedentesController } from './procedentes.controller';
import { ProcedentesService } from './procedentes.service';

@Module({
  imports: [FaseDerivacaoModule, EncadeamentosModule, ParceirosModule],
  controllers: [ProcedentesController],
  providers: [ProcedentesService],
  exports: [ProcedentesService],
})
export class ProcedentesModule {}
