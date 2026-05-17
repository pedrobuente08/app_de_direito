import { Module } from '@nestjs/common';
import { AudienciasModule } from '../audiencias/audiencias.module';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { FaseDerivacaoModule } from '../fase-derivacao/fase-derivacao.module';
import { PendenciasModule } from '../pendencias/pendencias.module';
import { SkillModule } from '../skill/skill.module';
import { ExtracaoPendenteController } from './extracao-pendente.controller';
import { PosImprocedenciaService } from './pos-improcedencia.service';
import { ProcessosController } from './processos.controller';
import { ProcessosService } from './processos.service';

@Module({
  imports: [
    SkillModule,
    EscritorioModule,
    AudienciasModule,
    FaseDerivacaoModule,
    PendenciasModule,
  ],
  controllers: [ProcessosController, ExtracaoPendenteController],
  providers: [ProcessosService, PosImprocedenciaService],
  exports: [ProcessosService],
})
export class ProcessosModule {}
