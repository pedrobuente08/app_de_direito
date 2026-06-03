import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ProcessosModule } from '../processos/processos.module';
import { DecisoesInterlocutoriasController } from './decisoes-interlocutorias.controller';
import { DecisoesInterlocutoriasService } from './decisoes-interlocutorias.service';

@Module({
  imports: [ProcessosModule, EncadeamentosModule, NotificacoesModule],
  controllers: [DecisoesInterlocutoriasController],
  providers: [DecisoesInterlocutoriasService],
  exports: [DecisoesInterlocutoriasService],
})
export class DecisoesInterlocutoriasModule {}
