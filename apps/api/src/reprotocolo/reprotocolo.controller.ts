import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { UpsertReprotocoloDto } from './dto/upsert-reprotocolo.dto';
import { ReprotocoloService } from './reprotocolo.service';

@Controller('reprotocolo')
export class ReprotocoloController {
  constructor(private readonly service: ReprotocoloService) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(
    @CurrentUser() user: AuthUser,
    @Query('subEstado') subEstado?: string,
  ) {
    return this.service.listar(user.escritorioId, subEstado);
  }

  @Get('resumo')
  @Throttle(ThrottlePresets.processosList)
  resumo(@CurrentUser() user: AuthUser) {
    return this.service.resumo(user.escritorioId);
  }

  @Get(':processoId')
  @Throttle(ThrottlePresets.processoGet)
  obter(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
  ) {
    return this.service.obter(user.escritorioId, processoId);
  }

  @Patch(':processoId')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPatch)
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
    @Body() dto: UpsertReprotocoloDto,
  ) {
    return this.service.upsert(user.escritorioId, processoId, dto);
  }
}
