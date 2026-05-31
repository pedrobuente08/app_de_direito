import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { AiCacheService } from './ai-cache.service';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';
import { AiQuotaService } from './ai-quota.service';

@Module({
  imports: [RedisModule],
  controllers: [AiGatewayController],
  providers: [AiGatewayService, AiQuotaService, AiCacheService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
