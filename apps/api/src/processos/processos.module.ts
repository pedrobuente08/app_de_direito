import { Module } from '@nestjs/common';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { SkillModule } from '../skill/skill.module';
import { ExtracaoPendenteController } from './extracao-pendente.controller';
import { ProcessosController } from './processos.controller';
import { ProcessosService } from './processos.service';

@Module({
  imports: [SkillModule, EscritorioModule],
  controllers: [ProcessosController, ExtracaoPendenteController],
  providers: [ProcessosService],
  exports: [ProcessosService],
})
export class ProcessosModule {}
