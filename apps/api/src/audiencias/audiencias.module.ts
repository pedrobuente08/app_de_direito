import { Module } from '@nestjs/common';
import { FaseDerivacaoModule } from '../fase-derivacao/fase-derivacao.module';
import { AudienciasController } from './audiencias.controller';
import { AudienciasService } from './audiencias.service';

@Module({
  imports: [FaseDerivacaoModule],
  controllers: [AudienciasController],
  providers: [AudienciasService],
  exports: [AudienciasService],
})
export class AudienciasModule {}
