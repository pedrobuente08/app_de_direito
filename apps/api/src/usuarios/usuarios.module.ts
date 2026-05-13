import { Module } from '@nestjs/common';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [EscritorioModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
