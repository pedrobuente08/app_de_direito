import { Module } from '@nestjs/common';
import { FaseDerivacaoModule } from '../fase-derivacao/fase-derivacao.module';
import { ProcedentesController } from './procedentes.controller';
import { ProcedentesService } from './procedentes.service';

@Module({
  imports: [FaseDerivacaoModule],
  controllers: [ProcedentesController],
  providers: [ProcedentesService],
  exports: [ProcedentesService],
})
export class ProcedentesModule {}
