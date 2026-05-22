import { Module } from '@nestjs/common';
import { ProcessosModule } from '../processos/processos.module';
import { DajeController } from './daje.controller';
import { DajeService } from './daje.service';

@Module({
  imports: [ProcessosModule],
  controllers: [DajeController],
  providers: [DajeService],
})
export class DajeModule {}
