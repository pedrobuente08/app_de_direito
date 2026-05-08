import { Module } from '@nestjs/common';
import { AudienciasModule } from '../audiencias/audiencias.module';
import { PendenciasModule } from '../pendencias/pendencias.module';
import { ComunicacoesDigestCronService } from './comunicacoes-digest.cron';
import { ComunicacoesController } from './comunicacoes.controller';
import { ComunicacoesService } from './comunicacoes.service';

@Module({
  imports: [PendenciasModule, AudienciasModule],
  controllers: [ComunicacoesController],
  providers: [ComunicacoesService, ComunicacoesDigestCronService],
})
export class ComunicacoesModule {}
