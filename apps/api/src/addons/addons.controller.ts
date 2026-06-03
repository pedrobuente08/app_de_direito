import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { AddonsService } from './addons.service';
import { ADDON_LABELS } from './addons.types';

@Controller('addons')
export class AddonsController {
  constructor(private readonly addons: AddonsService) {}

  @Get('status')
  @Throttle(ThrottlePresets.configRead)
  async status(@CurrentUser() user: AuthUser) {
    const flags = await this.addons.getAddons(user.escritorioId);
    return {
      addons: flags,
      labels: ADDON_LABELS,
    };
  }
}
