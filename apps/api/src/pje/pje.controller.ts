import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AddonGuard } from '../addons/addons.guard';
import { RequireAddon } from '../addons/addons.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { PjeService } from './pje.service';

@Controller()
@UseGuards(AddonGuard)
export class PjeController {
  constructor(private readonly pje: PjeService) {}

  @Get('processos/:processoId/producao-probatoria')
  @RequireAddon('justica_comum_pje')
  @Throttle(ThrottlePresets.processosList)
  listar(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
  ) {
    return this.pje.listarProducao(user.escritorioId, processoId);
  }

  @Post('processos/:processoId/producao-probatoria')
  @RequireAddon('justica_comum_pje')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  criar(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
    @Body() dto: Record<string, string | undefined>,
  ) {
    return this.pje.criarProducao(user.escritorioId, processoId, dto as never);
  }

  @Patch('producao-probatoria/:id')
  @RequireAddon('justica_comum_pje')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, string | undefined>,
  ) {
    return this.pje.atualizarProducao(user.escritorioId, id, dto);
  }
}
