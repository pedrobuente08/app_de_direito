import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { CumprirPendenciaDto } from './dto/cumprir-pendencia.dto';
import { CreatePendenciaDto } from './dto/create-pendencia.dto';
import { ListPendenciasQueryDto } from './dto/list-pendencias.query.dto';
import { UpdatePendenciaDto } from './dto/update-pendencia.dto';
import { PendenciasService } from './pendencias.service';

@Controller('pendencias')
export class PendenciasController {
  constructor(private readonly pendencias: PendenciasService) {}

  @Get()
  @Throttle(ThrottlePresets.pendenciasList)
  listar(
    @CurrentUser() user: AuthUser,
    @Query() query: ListPendenciasQueryDto,
  ) {
    return this.pendencias.listar(user.escritorioId, query);
  }

  @Get('resumo')
  @Throttle(ThrottlePresets.pendenciasList)
  resumo(@CurrentUser() user: AuthUser) {
    return this.pendencias.resumo(user.escritorioId);
  }

  @Post()
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.pendenciasWrite)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreatePendenciaDto) {
    return this.pendencias.criar(user.escritorioId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.pendenciasWrite)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePendenciaDto,
  ) {
    return this.pendencias.atualizar(user.escritorioId, id, dto);
  }

  @Post(':id/cumprir')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.pendenciasWrite)
  cumprir(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CumprirPendenciaDto,
  ) {
    return this.pendencias.cumprir(user.escritorioId, id, dto);
  }

  /**
   * `id` = UUID da linha em `pendencia_historico` (não da pendência ativa).
   * Cria nova pendência em aberto a partir do snapshot arquivado.
   */
  @Post(':id/reabrir')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.pendenciasWrite)
  reabrir(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) historicoId: string,
  ) {
    return this.pendencias.reabrirDeHistorico(user.escritorioId, historicoId);
  }
}
