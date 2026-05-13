import { Module } from '@nestjs/common';
import { ImprocedentesController } from './improcedentes.controller';
import { ImprocedentesService } from './improcedentes.service';

@Module({
  controllers: [ImprocedentesController],
  providers: [ImprocedentesService],
})
export class ImprocedentesModule {}
