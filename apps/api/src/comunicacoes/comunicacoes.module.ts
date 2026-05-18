import { Module } from '@nestjs/common';
import { AudienciasModule } from '../audiencias/audiencias.module';
import { PendenciasModule } from '../pendencias/pendencias.module';
import { ProcessosModule } from '../processos/processos.module';
import { ComunicacoesDigestCronService } from './comunicacoes-digest.cron';
import { ComunicacoesController } from './comunicacoes.controller';
import { ComunicacoesService } from './comunicacoes.service';

@Module({
  imports: [PendenciasModule, AudienciasModule, ProcessosModule],
  controllers: [ComunicacoesController],
  providers: [ComunicacoesService, ComunicacoesDigestCronService],
})
export class ComunicacoesModule {}
