import { Module } from '@nestjs/common';
import { ProcedentesController } from './procedentes.controller';
import { ProcedentesService } from './procedentes.service';

@Module({
  controllers: [ProcedentesController],
  providers: [ProcedentesService],
})
export class ProcedentesModule {}
