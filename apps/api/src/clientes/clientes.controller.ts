import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { ClientesService } from './clientes.service';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get(':cpf/processos')
  @Throttle(ThrottlePresets.processoGet)
  processos(
    @CurrentUser() user: AuthUser,
    @Param('cpf') cpf: string,
  ) {
    return this.clientes.listarProcessosPorCpf(user.escritorioId, cpf);
  }

  @Get(':cpf/restricoes-ativas')
  @Throttle(ThrottlePresets.processoGet)
  restricoes(
    @CurrentUser() user: AuthUser,
    @Param('cpf') cpf: string,
    @Query('relatorio') relatorio?: string,
  ) {
    return this.clientes.restricoesAtivas(
      user.escritorioId,
      cpf,
      relatorio ?? null,
    );
  }
}
