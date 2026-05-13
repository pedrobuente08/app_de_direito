import { Module } from '@nestjs/common';
import { AudienciasModule } from '../audiencias/audiencias.module';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { FaseDerivacaoModule } from '../fase-derivacao/fase-derivacao.module';
import { SkillModule } from '../skill/skill.module';
import { ExtracaoPendenteController } from './extracao-pendente.controller';
import { ProcessosController } from './processos.controller';
import { ProcessosService } from './processos.service';

@Module({
  imports: [SkillModule, EscritorioModule, AudienciasModule, FaseDerivacaoModule],
  controllers: [ProcessosController, ExtracaoPendenteController],
  providers: [ProcessosService],
  exports: [ProcessosService],
})
export class ProcessosModule {}
