import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { UpdateProcedenteDto } from './dto/update-procedente.dto';
import { ProcedentesService } from './procedentes.service';

@Controller('procedentes')
export class ProcedentesController {
  constructor(private readonly procedentes: ProcedentesService) {}

  @Get()
  @Throttle(ThrottlePresets.procedentesList)
  listar(@CurrentUser() user: AuthUser) {
    return this.procedentes.listar(user.escritorioId);
  }

  @Get(':processoId')
  @Throttle(ThrottlePresets.procedentesList)
  obter(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
  ) {
    return this.procedentes.obter(user.escritorioId, processoId);
  }

  @Patch(':processoId')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.procedentesWrite)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('processoId', ParseUUIDPipe) processoId: string,
    @Body() dto: UpdateProcedenteDto,
  ) {
    return this.procedentes.atualizar(
      user.escritorioId,
      processoId,
      dto,
      user,
    );
  }
}
