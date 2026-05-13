import { Module } from '@nestjs/common';
import { ProcessosModule } from '../processos/processos.module';
import { RecursosController } from './recursos.controller';
import { RecursosService } from './recursos.service';

@Module({
  imports: [ProcessosModule],
  controllers: [RecursosController],
  providers: [RecursosService],
})
export class RecursosModule {}
