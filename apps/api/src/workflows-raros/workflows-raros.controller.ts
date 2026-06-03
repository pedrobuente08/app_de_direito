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
import {
  AtualizarTutelaDto,
  CriarTutelaDto,
  HabilitarSucessorDto,
  RegistrarAutorFalecidoDto,
} from './dto/workflows-raros.dto';
import { WorkflowsRarosService } from './workflows-raros.service';

@Controller()
@UseGuards(AddonGuard)
export class WorkflowsRarosController {
  constructor(private readonly service: WorkflowsRarosService) {}

  @Get('processos/:processoId/tutelas')
  @RequireAddon('workflows_raros')
  @Throttle(ThrottlePresets.processosList)
  listarTutelas(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
  ) {
    return this.service.listarTutelas(user.escritorioId, processoId);
  }

  @Post('processos/:processoId/tutelas')
  @RequireAddon('workflows_raros')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  criarTutela(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
    @Body() dto: CriarTutelaDto,
  ) {
    return this.service.criarTutela(user.escritorioId, processoId, dto);
  }

  @Patch('tutelas/:id')
  @RequireAddon('workflows_raros')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  atualizarTutela(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarTutelaDto,
  ) {
    return this.service.atualizarTutela(user.escritorioId, id, dto);
  }

  @Get('processos/:processoId/sucessores')
  @RequireAddon('workflows_raros')
  @Throttle(ThrottlePresets.processosList)
  listarSucessores(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
  ) {
    return this.service.listarSucessores(user.escritorioId, processoId);
  }

  @Post('processos/:processoId/sucessores')
  @RequireAddon('workflows_raros')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  criarSucessor(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
    @Body() dto: { nome: string; cpf?: string; parentesco?: string; observacoes?: string },
  ) {
    return this.service.criarSucessor(user.escritorioId, processoId, dto);
  }

  @Post('processos/:processoId/autor-falecido')
  @RequireAddon('workflows_raros')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  registrarAutorFalecido(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
    @Body() dto: RegistrarAutorFalecidoDto,
  ) {
    return this.service.registrarAutorFalecido(user.escritorioId, processoId, dto);
  }

  @Patch('sucessores/:id/habilitar')
  @RequireAddon('workflows_raros')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  habilitarSucessor(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HabilitarSucessorDto,
  ) {
    return this.service.habilitarSucessor(user.escritorioId, id, dto);
  }
}
