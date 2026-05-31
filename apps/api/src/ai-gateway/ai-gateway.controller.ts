import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/metadata';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import type { AiTask } from './ai-gateway.types';
import { AiGatewayService } from './ai-gateway.service';

@Controller('ai-gateway')
export class AiGatewayController {
  constructor(
    private readonly gateway: AiGatewayService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  @Get('health')
  @Roles('admin', 'adm', 'advogado')
  async health(@CurrentUser() user: AuthUser) {
    return this.gateway.getHealth(user.escritorioId, this.redis != null);
  }

  @Get('quota')
  @Roles('admin', 'adm', 'advogado')
  async quota(@CurrentUser() user: AuthUser) {
    const health = await this.gateway.getHealth(user.escritorioId, this.redis != null);
    return health.quota;
  }

  @Get('usage')
  @Roles('admin', 'adm', 'advogado')
  async usage(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('periodo') periodo?: string,
  ) {
    const n = Number(limit) || 50;
    return this.gateway.listarUso(user.escritorioId, n, periodo);
  }

  /** Endpoint interno para features que consumirão IA nas próximas fases. */
  @Post('call')
  @Roles('admin', 'adm', 'advogado')
  async call(@CurrentUser() user: AuthUser, @Body() body: Omit<AiTask, 'tenantId' | 'userId'>) {
    return this.gateway.call({
      ...body,
      tenantId: user.escritorioId,
      userId: user.userId,
    });
  }
}
