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
    return this.dashboards.pendenciasPorStatus(user.escritorioId);
  }

  @Get('audiencias')
  @Throttle(ThrottlePresets.dashboardRead)
  audiencias(@CurrentUser() user: AuthUser) {
    return this.dashboards.audienciasResumo(user.escritorioId);
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
}
