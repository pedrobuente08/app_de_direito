import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { PainelService } from './painel.service';
import { PainelViewsScheduler } from './painel-views.scheduler';

@Module({
  imports: [AiGatewayModule],
  controllers: [DashboardsController],
  providers: [DashboardsService, PainelService, PainelViewsScheduler],
})
export class DashboardsModule {}
