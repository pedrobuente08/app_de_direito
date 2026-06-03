import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AlertasJobsService } from './alertas-jobs.service';
import { ProJobsService } from './pro-jobs.service';

@Module({
  imports: [NotificacoesModule, EncadeamentosModule],
  providers: [AlertasJobsService, ProJobsService],
})
export class JobsModule {}
