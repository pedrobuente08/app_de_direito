import { Controller, Get, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/metadata';
import { CapturaService } from './captura.service';

@Controller('captura')
export class CapturaController {
  constructor(private readonly captura: CapturaService) {}

  @Get('saude')
  @Roles('admin', 'adm', 'advogado')
  listarSaude(@CurrentUser() user: AuthUser) {
    return this.captura.listarSaude(user.escritorioId);
  }

  @Get('logs')
  @Roles('admin', 'adm', 'advogado')
  listarLogs(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    const n = Math.min(Math.max(Number(limit) || 20, 1), 100);
    return this.captura.listarLogs(user.escritorioId, n);
  }

  @Get('alerta')
  @Roles('admin', 'adm', 'advogado')
  obterAlerta(@CurrentUser() user: AuthUser) {
    return this.captura.obterAlerta(user.escritorioId);
  }

  /** Dispara captura manual imediata para todas as OABs do escritório (admin). */
  @Post('executar')
  @Roles('admin', 'adm')
  async executarManual(@CurrentUser() user: AuthUser) {
    const oabs = await this.captura.listarOabsDoEscritorio(user.escritorioId);
    const resultados = [];

    for (const row of oabs) {
      const res = await this.captura.capturarPorOab(user.escritorioId, row.oab);
      resultados.push({ oab: row.oab, ...res });
    }

    return { total: resultados.length, resultados };
  }
}
