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
import { Roles } from '../common/metadata';
import { ThrottlePresets } from '../common/throttle-presets';
import { UpdateImprocedenteDto } from './dto/update-improcedente.dto';
import { ImprocedentesService } from './improcedentes.service';

@Controller('improcedentes')
export class ImprocedentesController {
  constructor(private readonly improcedentes: ImprocedentesService) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(@CurrentUser() user: AuthUser) {
    return this.improcedentes.listar(user.escritorioId);
  }

  @Get('resumo')
  @Throttle(ThrottlePresets.processosList)
  resumo(@CurrentUser() user: AuthUser) {
    return this.improcedentes.resumo(user.escritorioId);
  }

  @Post(':id/certidao-credito')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  certidaoCredito(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.improcedentes.solicitarCertidaoCredito(user.escritorioId, id);
  }

  @Patch(':id')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPatch)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateImprocedenteDto,
  ) {
    return this.improcedentes.atualizar(user.escritorioId, id, dto);
  }
}
