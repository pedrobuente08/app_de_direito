import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { UpdateEscritorioConfigDto } from './dto/update-escritorio-config.dto';
import { EscritorioService } from './escritorio.service';

@Controller('escritorio')
export class EscritorioController {
  constructor(private readonly escritorio: EscritorioService) {}

  @Get('me')
  @Throttle(ThrottlePresets.escritorioMe)
  me(@CurrentUser() user: AuthUser) {
    return this.escritorio.obterPerfilTenant(user.escritorioId);
  }

  @Patch('config')
  @Roles('admin')
  @Throttle(ThrottlePresets.escritorioConfigPatch)
  patchConfig(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEscritorioConfigDto,
  ) {
    return this.escritorio.atualizarConfig(user.escritorioId, dto);
  }
}
