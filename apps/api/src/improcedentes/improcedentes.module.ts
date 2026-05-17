import { Module } from '@nestjs/common';
import { ProcessosModule } from '../processos/processos.module';
import { ImprocedentesController } from './improcedentes.controller';
import { ImprocedentesService } from './improcedentes.service';

@Module({
  imports: [ProcessosModule],
  controllers: [ImprocedentesController],
  providers: [ImprocedentesService],
})
export class ImprocedentesModule {}
