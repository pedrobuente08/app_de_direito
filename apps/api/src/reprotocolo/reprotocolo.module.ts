import { Module } from '@nestjs/common';
import { ReprotocoloController } from './reprotocolo.controller';
import { ReprotocoloService } from './reprotocolo.service';

@Module({
  controllers: [ReprotocoloController],
  providers: [ReprotocoloService],
  exports: [ReprotocoloService],
})
export class ReprotocoloModule {}
