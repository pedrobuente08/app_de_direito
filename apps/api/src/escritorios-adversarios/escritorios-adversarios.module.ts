import { Module } from '@nestjs/common';
import { EscritoriosAdversariosController } from './escritorios-adversarios.controller';
import { EscritoriosAdversariosService } from './escritorios-adversarios.service';

@Module({
  controllers: [EscritoriosAdversariosController],
  providers: [EscritoriosAdversariosService],
  exports: [EscritoriosAdversariosService],
})
export class EscritoriosAdversariosModule {}
