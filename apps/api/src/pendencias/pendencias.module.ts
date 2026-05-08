import { Module } from '@nestjs/common';
import { PendenciasController } from './pendencias.controller';
import { PendenciasService } from './pendencias.service';

@Module({
  controllers: [PendenciasController],
  providers: [PendenciasService],
  exports: [PendenciasService],
})
export class PendenciasModule {}
