import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { CumprirPendenciaDto } from '../pendencias/dto/cumprir-pendencia.dto';
import { TelemarketingService } from './telemarketing.service';

@Controller('telemarketing')
export class TelemarketingController {
  constructor(private readonly service: TelemarketingService) {}

  @Get('resumo')
  @Throttle(ThrottlePresets.pendenciasList)
  resumo(@CurrentUser() user: AuthUser) {
    return this.service.resumo(user.escritorioId);
  }

  @Get()
  @Throttle(ThrottlePresets.pendenciasList)
  listar(
    @CurrentUser() user: AuthUser,
    @Query('minhas') minhas?: string,
  ) {
    const responsavel =
      minhas === '1' || minhas === 'true' ? user.email || user.userId : undefined;
    return this.service.listar(user.escritorioId, responsavel);
  }

  @Post('puxar')
  @Roles('admin', 'adm', 'advogado', 'telemarketing')
  @Throttle(ThrottlePresets.pendenciasWrite)
  puxar(@CurrentUser() user: AuthUser) {
    const rotulo = user.email || user.userId;
    return this.service.puxar(user.escritorioId, user.userId, rotulo);
  }

  @Post('pendencias/:id/cumprir')
  @Roles('admin', 'adm', 'advogado', 'telemarketing')
  @Throttle(ThrottlePresets.pendenciasWrite)
  cumprir(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CumprirPendenciaDto,
  ) {
    return this.service.cumprir(user.escritorioId, id, dto);
  }
}
