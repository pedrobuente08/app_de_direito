import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { AudienciasModule } from '../audiencias/audiencias.module';
import { FaseDerivacaoModule } from '../fase-derivacao/fase-derivacao.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PendenciasModule } from '../pendencias/pendencias.module';
import { ProcessosModule } from '../processos/processos.module';
import { ComunicacoesDigestCronService } from './comunicacoes-digest.cron';
import { ComunicacoesOrfasCronService } from './comunicacoes-orfas.cron';
import { ComunicacoesController } from './comunicacoes.controller';
import { ComunicacoesService } from './comunicacoes.service';

@Module({
  imports: [
    AuditModule,
    EncadeamentosModule,
    PendenciasModule,
    AudienciasModule,
    ProcessosModule,
    FaseDerivacaoModule,
    NotificacoesModule,
  ],
  controllers: [ComunicacoesController],
  providers: [ComunicacoesService, ComunicacoesDigestCronService, ComunicacoesOrfasCronService],
  exports: [ComunicacoesService],
})
export class ComunicacoesModule {}
