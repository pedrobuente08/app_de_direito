import { Module } from '@nestjs/common';
import { AudienciasModule } from '../audiencias/audiencias.module';
import { PendenciasModule } from '../pendencias/pendencias.module';
import { ProcessosModule } from '../processos/processos.module';
import { ImportacaoController } from './importacao.controller';
import { ImportacaoService } from './importacao.service';

@Module({
  imports: [ProcessosModule, PendenciasModule, AudienciasModule],
  controllers: [ImportacaoController],
  providers: [ImportacaoService],
})
export class ImportacaoModule {}
