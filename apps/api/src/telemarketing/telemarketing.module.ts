import { Module } from '@nestjs/common';
import { PendenciasModule } from '../pendencias/pendencias.module';
import { TelemarketingController } from './telemarketing.controller';
import { TelemarketingService } from './telemarketing.service';

@Module({
  imports: [PendenciasModule],
  controllers: [TelemarketingController],
  providers: [TelemarketingService],
})
export class TelemarketingModule {}
