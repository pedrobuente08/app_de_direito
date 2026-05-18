import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AlertasJobsService } from './alertas-jobs.service';

@Module({
  imports: [NotificacoesModule, EncadeamentosModule],
  providers: [AlertasJobsService],
})
export class JobsModule {}
