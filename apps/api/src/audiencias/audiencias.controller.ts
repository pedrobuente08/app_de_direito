import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { AudienciasService } from './audiencias.service';
import { CreateAudienciaDto } from './dto/create-audiencia.dto';
import { FinalizarAudienciaDto } from './dto/finalizar-audiencia.dto';
import { UpdateAudienciaDto } from './dto/update-audiencia.dto';

@Controller('audiencias')
export class AudienciasController {
  constructor(private readonly audiencias: AudienciasService) {}

  @Get('relatorio-ausentes-6m')
  @Throttle(ThrottlePresets.audienciasList)
  relatorioAusentes6m(@CurrentUser() user: AuthUser) {
    return this.audiencias.relatorioAusentes6Meses(user.escritorioId);
  }

  @Get()
  @Throttle(ThrottlePresets.audienciasList)
  listar(@CurrentUser() user: AuthUser) {
    return this.audiencias.listar(user.escritorioId);
  }

  @Post()
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.audienciasWrite)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateAudienciaDto) {
    return this.audiencias.criar(user.escritorioId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.audienciasWrite)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAudienciaDto,
  ) {
    return this.audiencias.atualizar(user.escritorioId, id, dto);
  }

  @Post(':id/finalizar')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.audienciasWrite)
  finalizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizarAudienciaDto,
  ) {
    return this.audiencias.finalizar(user.escritorioId, id, dto);
  }
}
