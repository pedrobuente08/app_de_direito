import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { ImprocedentesService } from './improcedentes.service';

@Controller('improcedentes')
export class ImprocedentesController {
  constructor(private readonly improcedentes: ImprocedentesService) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(@CurrentUser() user: AuthUser) {
    return this.improcedentes.listar(user.escritorioId);
  }
}
