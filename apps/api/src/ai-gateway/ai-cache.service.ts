import { createHash } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { AI_CACHE_TTL_SEC } from './ai-gateway.constants';
import type { AiFeature } from './ai-gateway.types';

type CacheEntry = { text: string; storedAt: number };

@Injectable()
export class AiCacheService {
  private readonly logger = new Logger(AiCacheService.name);
  private readonly mem = new Map<string, CacheEntry>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  private key(feature: AiFeature, payload: string): string {
    const hash = createHash('sha256').update(payload).digest('hex');
    return `ai:cache:${feature}:${hash}`;
  }

  async get(feature: AiFeature, payload: string): Promise<string | null> {
    const k = this.key(feature, payload);

    if (this.redis) {
      try {
        const raw = await this.redis.get(k);
        if (raw) return JSON.parse(raw) as string;
      } catch (e) {
        this.logger.warn(`Redis cache read falhou: ${(e as Error).message}`);
      }
    }

    const entry = this.mem.get(k);
    if (!entry) return null;
    if (Date.now() - entry.storedAt > AI_CACHE_TTL_SEC * 1000) {
      this.mem.delete(k);
      return null;
    }
    return entry.text;
  }

  async set(feature: AiFeature, payload: string, text: string): Promise<void> {
    const k = this.key(feature, payload);

    if (this.redis) {
      try {
        await this.redis.set(k, JSON.stringify(text), 'EX', AI_CACHE_TTL_SEC);
        return;
      } catch (e) {
        this.logger.warn(`Redis cache write falhou: ${(e as Error).message}`);
      }
    }

    this.mem.set(k, { text, storedAt: Date.now() });
  }
}
