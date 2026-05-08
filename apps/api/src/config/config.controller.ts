import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { UpdateEscritorioConfigDto } from '../escritorio/dto/update-escritorio-config.dto';
import { EscritorioService } from '../escritorio/escritorio.service';

/** Paridade com briefing: `GET/PATCH /api/config` → config JSON do tenant. */
@Controller('config')
export class ConfigController {
  constructor(private readonly escritorio: EscritorioService) {}

  @Get()
  @Throttle(ThrottlePresets.configRead)
  obter(@CurrentUser() user: AuthUser) {
    return this.escritorio.obterPerfilTenant(user.escritorioId);
  }

  @Patch()
  @Roles('admin')
  @Throttle(ThrottlePresets.configWrite)
  atualizar(@CurrentUser() user: AuthUser, @Body() dto: UpdateEscritorioConfigDto) {
    return this.escritorio.atualizarConfig(user.escritorioId, dto);
  }
}
