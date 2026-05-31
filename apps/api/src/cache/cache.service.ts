import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Cache simples sobre Redis para resultados de dashboard.
 * Se REDIS_URL não estiver configurada, opera como no-op (sem cache).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly log = new Logger(CacheService.name);
  private readonly client: Redis | null;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL')?.trim();
    if (url) {
      this.client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false });
      this.client.on('error', (e) => this.log.warn(`Redis cache error: ${e.message}`));
    } else {
      this.client = null;
    }
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => {});
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      /* não bloqueia */
    }
  }

  async del(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length) await this.client.del(...keys);
    } catch {
      /* não bloqueia */
    }
  }

  /** Busca do cache; se ausente, executa fn e armazena o resultado. */
  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  }
}
