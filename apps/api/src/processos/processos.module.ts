import { Module } from '@nestjs/common';
import { AudienciasModule } from '../audiencias/audiencias.module';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { FaseDerivacaoModule } from '../fase-derivacao/fase-derivacao.module';
import { PendenciasModule } from '../pendencias/pendencias.module';
import { EscritoriosAdversariosModule } from '../escritorios-adversarios/escritorios-adversarios.module';
import { ReusModule } from '../reus/reus.module';
import { SkillModule } from '../skill/skill.module';
import { ExtracaoPendenteController } from './extracao-pendente.controller';
import { PosExtincaoService } from './pos-extincao.service';
import { PosImprocedenciaService } from './pos-improcedencia.service';
import { PosProcedenteParcialService } from './pos-procedente-parcial.service';
import { ProcessosController } from './processos.controller';
import { ProcessosService } from './processos.service';
import { ProcessosWorkflowService } from './processos-workflow.service';

@Module({
  imports: [
    SkillModule,
    EscritorioModule,
    AudienciasModule,
    FaseDerivacaoModule,
    PendenciasModule,
    ReusModule,
    EscritoriosAdversariosModule,
  ],
  controllers: [ProcessosController, ExtracaoPendenteController],
  providers: [
    ProcessosService,
    PosImprocedenciaService,
    PosExtincaoService,
    PosProcedenteParcialService,
    ProcessosWorkflowService,
  ],
  exports: [ProcessosService, ProcessosWorkflowService],
})
export class ProcessosModule {}
