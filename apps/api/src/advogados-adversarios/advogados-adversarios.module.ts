import { Module } from '@nestjs/common';
import { AdvogadosAdversariosController } from './advogados-adversarios.controller';
import { AdvogadosAdversariosService } from './advogados-adversarios.service';

@Module({
  controllers: [AdvogadosAdversariosController],
  providers: [AdvogadosAdversariosService],
  exports: [AdvogadosAdversariosService],
})
export class AdvogadosAdversariosModule {}
