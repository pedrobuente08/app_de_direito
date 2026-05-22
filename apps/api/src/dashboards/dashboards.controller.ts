import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { DashboardsService } from './dashboards.service';

@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Get('varas')
  @Throttle(ThrottlePresets.dashboardRead)
  varas(
    @CurrentUser() user: AuthUser,
    @Query('cidade') cidade?: string,
  ) {
    return this.dashboards.porVaras(user.escritorioId, cidade);
  }

  @Get('pendencias')
  @Throttle(ThrottlePresets.dashboardRead)
  pendencias(@CurrentUser() user: AuthUser) {
    return this.dashboards.pendenciasDashboard(user.escritorioId);
  }

  @Get('geral')
  @Throttle(ThrottlePresets.dashboardRead)
  geral(@CurrentUser() user: AuthUser) {
    return this.dashboards.geral(user.escritorioId);
  }

  @Get('audiencias')
  @Throttle(ThrottlePresets.dashboardRead)
  audiencias(@CurrentUser() user: AuthUser) {
    return this.dashboards.audienciasDashboard(user.escritorioId);
  }

  @Get('tese-reu-vara')
  @Throttle(ThrottlePresets.dashboardRead)
  teseReuVara(
    @CurrentUser() user: AuthUser,
    @Query('materia') materia?: string,
    @Query('reu') reu?: string,
    @Query('vara') vara?: string,
  ) {
    return this.dashboards.teseReuVara(
      user.escritorioId,
      materia,
      reu,
      vara,
    );
  }

  @Get('qualidade-procedencia')
  @Throttle(ThrottlePresets.dashboardRead)
  qualidadeProcedencia(@CurrentUser() user: AuthUser) {
    return this.dashboards.qualidadeProcedencia(user.escritorioId);
  }

  @Get('top-bancas-adversarias')
  @Throttle(ThrottlePresets.dashboardRead)
  topBancas(@CurrentUser() user: AuthUser) {
    return this.dashboards.topBancasAdversarias(user.escritorioId);
  }

  @Get('cruzamento-5d')
  @Throttle(ThrottlePresets.dashboardRead)
  cruzamento5d(@CurrentUser() user: AuthUser) {
    return this.dashboards.cruzamento5d(user.escritorioId);
  }

  @Get('passivo-sucumbencia')
  @Throttle(ThrottlePresets.dashboardRead)
  passivoSucumbencia(@CurrentUser() user: AuthUser) {
    return this.dashboards.passivoSucumbencia(user.escritorioId);
  }

  @Get('pendencias-origem')
  @Throttle(ThrottlePresets.dashboardRead)
  pendenciasOrigem(@CurrentUser() user: AuthUser) {
    return this.dashboards.pendenciasPorOrigem(user.escritorioId);
  }

  @Get('recursos')
  @Throttle(ThrottlePresets.dashboardRead)
  recursos(@CurrentUser() user: AuthUser) {
    return this.dashboards.recursos(user.escritorioId);
  }

  @Get('improcedentes')
  @Throttle(ThrottlePresets.dashboardRead)
  improcedentes(@CurrentUser() user: AuthUser) {
    return this.dashboards.improcedentes(user.escritorioId);
  }

  @Get('financeiro')
  @Throttle(ThrottlePresets.dashboardRead)
  financeiro(@CurrentUser() user: AuthUser) {
    return this.dashboards.financeiro(user.escritorioId);
  }

  @Get('litigancia-ma-fe')
  @Throttle(ThrottlePresets.dashboardRead)
  litiganciaMaFe(@CurrentUser() user: AuthUser) {
    return this.dashboards.litiganciaMaFe(user.escritorioId);
  }
}
