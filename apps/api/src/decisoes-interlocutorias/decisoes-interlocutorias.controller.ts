import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AddonGuard } from '../addons/addons.guard';
import { RequireAddon } from '../addons/addons.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { ClassificarInterlocutoriaDto } from './dto/classificar-interlocutoria.dto';
import { DecisoesInterlocutoriasService } from './decisoes-interlocutorias.service';

@Controller('decisoes-interlocutorias')
@UseGuards(AddonGuard)
export class DecisoesInterlocutoriasController {
  constructor(private readonly service: DecisoesInterlocutoriasService) {}

  @Post('classificar')
  @RequireAddon('recursos_avancados')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  classificar(
    @CurrentUser() user: AuthUser,
    @Body() dto: ClassificarInterlocutoriaDto,
  ) {
    return this.service.classificar(user.escritorioId, dto);
  }
}
