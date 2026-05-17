import { Module } from '@nestjs/common';
import { MigracaoProcedentesController } from './migracao-procedentes.controller';
import { MigracaoProcedentesService } from './migracao-procedentes.service';

@Module({
  controllers: [MigracaoProcedentesController],
  providers: [MigracaoProcedentesService],
})
export class MigracaoModule {}
