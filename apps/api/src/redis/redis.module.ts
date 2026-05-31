import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const redisUrl = process.env.REDIS_URL?.trim();

const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis | null => {
    if (!redisUrl) return null;
    return new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
  },
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
