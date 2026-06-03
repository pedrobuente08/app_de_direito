import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AddonGuard } from '../addons/addons.guard';
import { RequireAddon } from '../addons/addons.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { InterporEmbargosDto } from './dto/interpor-embargos.dto';
import { RegistrarResultadoEmbargosDto } from './dto/registrar-resultado-embargos.dto';
import { EmbargosService } from './embargos.service';

@Controller('embargos')
@UseGuards(AddonGuard)
export class EmbargosController {
  constructor(private readonly embargos: EmbargosService) {}

  @Get()
  @RequireAddon('recursos_avancados')
  @Throttle(ThrottlePresets.processosList)
  listar(
    @CurrentUser() user: AuthUser,
    @Query('processoId') processoId?: string,
  ) {
    const id = processoId?.trim();
    if (!id) {
      throw new BadRequestException('Informe processoId na query string.');
    }
    return this.embargos.listarPorProcesso(user.escritorioId, id);
  }

  @Post()
  @RequireAddon('recursos_avancados')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  interpor(@CurrentUser() user: AuthUser, @Body() dto: InterporEmbargosDto) {
    return this.embargos.interpor(user.escritorioId, dto);
  }

  @Patch(':id/resultado')
  @RequireAddon('recursos_avancados')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  registrarResultado(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RegistrarResultadoEmbargosDto,
  ) {
    return this.embargos.registrarResultado(user.escritorioId, id, dto);
  }
}
