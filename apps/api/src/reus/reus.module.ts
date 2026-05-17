import { Module } from '@nestjs/common';
import { ReusController } from './reus.controller';
import { ReusService } from './reus.service';

@Module({
  controllers: [ReusController],
  providers: [ReusService],
  exports: [ReusService],
})
export class ReusModule {}
