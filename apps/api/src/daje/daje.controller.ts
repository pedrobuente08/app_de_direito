import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/metadata';
import { ThrottlePresets } from '../common/throttle-presets';
import { DajeService } from './daje.service';
import { EmitirDajeDto } from './dto/emitir-daje.dto';
import { ResultadoIsencaoDajeDto } from './dto/resultado-isencao-daje.dto';

@Controller('processos/:processoId/daje')
export class DajeController {
  constructor(private readonly daje: DajeService) {}

  @Post('emitir')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  emitir(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
    @Body() dto: EmitirDajeDto,
  ) {
    return this.daje.emitir(user.escritorioId, processoId, dto);
  }

  @Post('pedir-isencao')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  pedirIsencao(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
  ) {
    return this.daje.pedirIsencao(user.escritorioId, processoId);
  }

  @Post('resultado-isencao')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  resultadoIsencao(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
    @Body() dto: ResultadoIsencaoDajeDto,
  ) {
    return this.daje.resultadoIsencao(user.escritorioId, processoId, dto);
  }

  @Post('registrar-pagamento')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  registrarPagamento(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
  ) {
    return this.daje.registrarPagamento(user.escritorioId, processoId);
  }

  @Post('inadimplencia')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  inadimplencia(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
  ) {
    return this.daje.inadimplencia(user.escritorioId, processoId);
  }
}
