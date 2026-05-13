import { Module } from '@nestjs/common';
import { FaseDerivacaoModule } from '../fase-derivacao/fase-derivacao.module';
import { PendenciasController } from './pendencias.controller';
import { PendenciasService } from './pendencias.service';

@Module({
  imports: [FaseDerivacaoModule],
  controllers: [PendenciasController],
  providers: [PendenciasService],
  exports: [PendenciasService],
})
export class PendenciasModule {}
