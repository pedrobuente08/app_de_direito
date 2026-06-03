import { Global, Module } from '@nestjs/common';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { AddonsController } from './addons.controller';
import { AddonGuard } from './addons.guard';
import { AddonsService } from './addons.service';

@Global()
@Module({
  imports: [EscritorioModule],
  controllers: [AddonsController],
  providers: [AddonsService, AddonGuard],
  exports: [AddonsService, AddonGuard],
})
export class AddonsModule {}
