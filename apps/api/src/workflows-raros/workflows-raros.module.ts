import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { FaseDerivacaoModule } from '../fase-derivacao/fase-derivacao.module';
import { ProcessosModule } from '../processos/processos.module';
import { WorkflowsRarosController } from './workflows-raros.controller';
import { WorkflowsRarosService } from './workflows-raros.service';

@Module({
  imports: [ProcessosModule, EncadeamentosModule, FaseDerivacaoModule],
  controllers: [WorkflowsRarosController],
  providers: [WorkflowsRarosService],
})
export class WorkflowsRarosModule {}
