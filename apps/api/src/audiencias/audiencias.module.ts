import { Module } from '@nestjs/common';
import { AudienciasController } from './audiencias.controller';
import { AudienciasService } from './audiencias.service';

@Module({
  controllers: [AudienciasController],
  providers: [AudienciasService],
  exports: [AudienciasService],
})
export class AudienciasModule {}
