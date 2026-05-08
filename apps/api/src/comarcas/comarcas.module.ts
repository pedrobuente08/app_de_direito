import { Module } from '@nestjs/common';
import { ComarcasController } from './comarcas.controller';
import { ComarcasService } from './comarcas.service';

@Module({
  controllers: [ComarcasController],
  providers: [ComarcasService],
})
export class ComarcasModule {}
