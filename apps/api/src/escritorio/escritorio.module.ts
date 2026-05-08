import { Module } from '@nestjs/common';
import { EscritorioController } from './escritorio.controller';
import { EscritorioService } from './escritorio.service';

@Module({
  controllers: [EscritorioController],
  providers: [EscritorioService],
  exports: [EscritorioService],
})
export class EscritorioModule {}
