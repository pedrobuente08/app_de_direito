import { Module } from '@nestjs/common';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { ComarcasController } from './comarcas.controller';
import { ComarcasService } from './comarcas.service';

@Module({
  imports: [EscritorioModule],
  controllers: [ComarcasController],
  providers: [ComarcasService],
})
export class ComarcasModule {}
