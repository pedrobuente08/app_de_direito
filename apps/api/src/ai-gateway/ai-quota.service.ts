import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import { DrizzleService } from '../db/drizzle.service';
import { aiQuota } from '../db/schema/ai-quota';
import { REDIS_CLIENT } from '../redis/redis.constants';
import {
  DEFAULT_PLANO,
  PLANO_CREDITOS,
} from './ai-gateway.constants';
import type { AiQuotaView } from './ai-gateway.types';

@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  periodoAtual(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private redisKey(tenantId: string, periodo: string): string {
    return `ai:quota:${tenantId}:${periodo}`;
  }

  private nomeMes(periodo: string): string {
    const [y, m] = periodo.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(
      new Date(y!, m! - 1, 1),
    );
  }

  async ensureQuota(tenantId: string, periodo?: string): Promise<typeof aiQuota.$inferSelect> {
    const p = periodo ?? this.periodoAtual();

    const [existing] = await this.drizzle.db
      .select()
      .from(aiQuota)
      .where(and(eq(aiQuota.tenantId, tenantId), eq(aiQuota.periodo, p)))
      .limit(1);

    if (existing) return existing;

    const plano = DEFAULT_PLANO;
    const creditosTotal = PLANO_CREDITOS[plano] ?? PLANO_CREDITOS.escritorio;

    const [created] = await this.drizzle.db
      .insert(aiQuota)
      .values({
        tenantId,
        periodo: p,
        plano,
        creditosTotal,
        creditosUsados: 0,
        overagePolicy: 'block',
      })
      .onConflictDoNothing({ target: [aiQuota.tenantId, aiQuota.periodo] })
      .returning();

    if (created) {
      await this.syncRedis(tenantId, p, 0);
      return created;
    }

    const [row] = await this.drizzle.db
      .select()
      .from(aiQuota)
      .where(and(eq(aiQuota.tenantId, tenantId), eq(aiQuota.periodo, p)))
      .limit(1);

    if (!row) {
      throw new Error('Falha ao criar quota de IA');
    }
    return row;
  }

  async syncRedis(tenantId: string, periodo: string, usados: number): Promise<void> {
    if (!this.redis) return;
    try {
      const k = this.redisKey(tenantId, periodo);
      await this.redis.set(k, String(usados), 'EX', 60 * 60 * 24 * 45);
    } catch (e) {
      this.logger.warn(`Redis quota sync falhou: ${(e as Error).message}`);
    }
  }

  async getUsados(tenantId: string, periodo?: string): Promise<number> {
    const p = periodo ?? this.periodoAtual();
    const k = this.redisKey(tenantId, p);

    if (this.redis) {
      try {
        const val = await this.redis.get(k);
        if (val != null) return Number(val);
      } catch (e) {
        this.logger.warn(`Redis quota read falhou: ${(e as Error).message}`);
      }
    }

    const row = await this.ensureQuota(tenantId, p);
    await this.syncRedis(tenantId, p, row.creditosUsados);
    return row.creditosUsados;
  }

  async toView(tenantId: string): Promise<AiQuotaView & { periodoLabel: string }> {
    const periodo = this.periodoAtual();
    const row = await this.ensureQuota(tenantId, periodo);
    const usados = await this.getUsados(tenantId, periodo);
    const restantes = Math.max(0, row.creditosTotal - usados);
    const pct =
      row.creditosTotal > 0
        ? Math.min(100, Math.round((usados / row.creditosTotal) * 100))
        : 0;

    return {
      periodo,
      periodoLabel: this.nomeMes(periodo),
      plano: row.plano,
      creditosTotal: row.creditosTotal,
      creditosUsados: usados,
      creditosRestantes: restantes,
      percentualUsado: pct,
      overagePolicy: row.overagePolicy,
    };
  }

  /** Pré-voo: lança se quota esgotada (policy block). */
  async preflight(tenantId: string, creditosEstimados = 1): Promise<void> {
    const periodo = this.periodoAtual();
    const row = await this.ensureQuota(tenantId, periodo);
    const usados = await this.getUsados(tenantId, periodo);

    if (row.overagePolicy === 'block' && usados + creditosEstimados > row.creditosTotal) {
      throw new ForbiddenException(
        `Quota de IA esgotada (${usados}/${row.creditosTotal} créditos em ${periodo}).`,
      );
    }
  }

  async debit(tenantId: string, creditos: number): Promise<void> {
    if (creditos <= 0) return;

    const periodo = this.periodoAtual();
    await this.ensureQuota(tenantId, periodo);

    await this.drizzle.db
      .update(aiQuota)
      .set({
        creditosUsados: sql`${aiQuota.creditosUsados} + ${creditos}`,
        updatedAt: new Date(),
      })
      .where(and(eq(aiQuota.tenantId, tenantId), eq(aiQuota.periodo, periodo)));

    if (this.redis) {
      try {
        const k = this.redisKey(tenantId, periodo);
        await this.redis.incrby(k, creditos);
        await this.redis.expire(k, 60 * 60 * 24 * 45);
      } catch (e) {
        this.logger.warn(`Redis quota debit falhou: ${(e as Error).message}`);
      }
    }
  }
}
