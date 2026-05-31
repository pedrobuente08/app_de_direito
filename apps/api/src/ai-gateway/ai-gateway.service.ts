import Anthropic from '@anthropic-ai/sdk';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { aiUsage } from '../db/schema/ai-usage';
import { modelRegistry } from '../db/schema/model-registry';
import { AiCacheService } from './ai-cache.service';
import {
  CREDITOS_POR_REAL,
  MODEL_ID,
  MODEL_MATRIX,
  SYSTEM_PROMPTS,
} from './ai-gateway.constants';
import type {
  AiHealthView,
  AiResult,
  AiTask,
  AiUsageByFeature,
  AiUsageRow,
} from './ai-gateway.types';
import { AiQuotaService } from './ai-quota.service';

type ModelPricing = {
  model: string;
  inputPriceUsd: number;
  outputPriceUsd: number;
  cacheReadDiscount: number;
};

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly anthropic: Anthropic | null;
  private readonly usdBrl: number;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cache: AiCacheService,
    private readonly quota: AiQuotaService,
  ) {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    this.anthropic = key ? new Anthropic({ apiKey: key }) : null;
    this.usdBrl = Number(process.env.AI_USD_BRL_RATE ?? '5.5') || 5.5;
  }

  isAnthropicConfigured(): boolean {
    return this.anthropic != null;
  }

  async call(task: AiTask): Promise<AiResult> {
    const started = Date.now();
    const modelKey = task.model ?? MODEL_MATRIX[task.feature];
    const modelId = MODEL_ID[modelKey];

    const cached = await this.cache.get(task.feature, task.payload);
    if (cached != null) {
      const result: AiResult = {
        text: cached,
        model: modelId,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        custoBrl: 0,
        creditos: 0,
        cacheHit: true,
        latencyMs: Date.now() - started,
      };

      await this.registrarUso(task, result, modelId);
      return result;
    }

    await this.quota.preflight(task.tenantId, 1);

    if (!this.anthropic) {
      throw new ServiceUnavailableException(
        'ANTHROPIC_API_KEY não configurada — chamadas de IA indisponíveis.',
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[task.feature];
    const maxTokens = task.maxTokens ?? (modelKey === 'sonnet' ? 4096 : 1024);

    let response: Anthropic.Message;
    try {
      response = await this.anthropic.messages.create({
        model: modelId,
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: task.payload }],
      });
    } catch (e) {
      this.logger.error(`Anthropic call falhou: ${(e as Error).message}`);
      throw new ServiceUnavailableException(
        `Provedor de IA indisponível: ${(e as Error).message}`,
      );
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    if (!text) {
      throw new BadRequestException('Resposta vazia do provedor de IA.');
    }

    const usage = response.usage;
    const inputTokens = usage.input_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;
    const cacheReadTokens =
      (usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0;
    const cacheWriteTokens =
      (usage as { cache_creation_input_tokens?: number }).cache_creation_input_tokens ?? 0;

    const pricing = await this.getPricing(modelId);
    const custoBrl = this.calcularCustoBrl(pricing, {
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
    });
    const creditos = Math.max(1, Math.ceil(custoBrl * CREDITOS_POR_REAL));

    const result: AiResult = {
      text,
      model: modelId,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      custoBrl,
      creditos,
      cacheHit: false,
      latencyMs: Date.now() - started,
    };

    await this.registrarUso(task, result, modelId);
    await this.quota.debit(task.tenantId, creditos);
    await this.cache.set(task.feature, task.payload, text);

    return result;
  }

  private async getPricing(modelId: string): Promise<ModelPricing> {
    const [row] = await this.drizzle.db
      .select()
      .from(modelRegistry)
      .where(and(eq(modelRegistry.model, modelId), eq(modelRegistry.active, true)))
      .limit(1);

    if (row) {
      return {
        model: modelId,
        inputPriceUsd: Number(row.inputPriceUsd),
        outputPriceUsd: Number(row.outputPriceUsd),
        cacheReadDiscount: Number(row.cacheReadDiscount),
      };
    }

    return modelId.includes('haiku')
      ? { model: modelId, inputPriceUsd: 0.0008, outputPriceUsd: 0.004, cacheReadDiscount: 0.1 }
      : { model: modelId, inputPriceUsd: 0.003, outputPriceUsd: 0.015, cacheReadDiscount: 0.1 };
  }

  private calcularCustoBrl(
    pricing: ModelPricing,
    tokens: {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
    },
  ): number {
    const billableInput = Math.max(0, tokens.inputTokens - tokens.cacheReadTokens);
    const cacheReadCost =
      (tokens.cacheReadTokens / 1000) *
      pricing.inputPriceUsd *
      pricing.cacheReadDiscount;
    const inputCost = (billableInput / 1000) * pricing.inputPriceUsd + cacheReadCost;
    const cacheWriteCost = (tokens.cacheWriteTokens / 1000) * pricing.inputPriceUsd;
    const outputCost = (tokens.outputTokens / 1000) * pricing.outputPriceUsd;
    const usd = inputCost + cacheWriteCost + outputCost;
    return Math.round(usd * this.usdBrl * 1_000_000) / 1_000_000;
  }

  private async registrarUso(
    task: AiTask,
    result: AiResult,
    modelId: string,
  ): Promise<void> {
    try {
      await this.drizzle.db.insert(aiUsage).values({
        tenantId: task.tenantId,
        userId: task.userId,
        feature: task.feature,
        provider: 'anthropic',
        model: modelId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cacheReadTokens: result.cacheReadTokens,
        cacheWriteTokens: result.cacheWriteTokens,
        custoBrl: String(result.custoBrl),
        creditos: result.creditos,
        cacheHit: result.cacheHit,
        latencyMs: result.latencyMs,
        processoId: task.processoId,
        conversaId: task.conversaId,
      });
    } catch (e) {
      this.logger.error(`Falha ao registrar ai_usage: ${(e as Error).message}`);
    }
  }

  async getHealth(tenantId: string, redisAtivo: boolean): Promise<AiHealthView> {
    const quota = await this.quota.toView(tenantId);
    const periodo = quota.periodo;
    const inicioMes = new Date(`${periodo}-01T00:00:00.000Z`);

    const usoPorFeature = await this.drizzle.db
      .select({
        feature: aiUsage.feature,
        totalCreditos: sql<number>`coalesce(sum(${aiUsage.creditos}), 0)::int`,
        totalChamadas: sql<number>`count(*)::int`,
      })
      .from(aiUsage)
      .where(and(eq(aiUsage.tenantId, tenantId), gte(aiUsage.createdAt, inicioMes)))
      .groupBy(aiUsage.feature)
      .orderBy(desc(sql`sum(${aiUsage.creditos})`));

    const rows = await this.drizzle.db
      .select()
      .from(aiUsage)
      .where(and(eq(aiUsage.tenantId, tenantId), gte(aiUsage.createdAt, inicioMes)))
      .orderBy(desc(aiUsage.createdAt))
      .limit(10);

    const ultimasChamadas: AiUsageRow[] = rows.map((r) => ({
      id: r.id,
      feature: r.feature,
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      creditos: r.creditos,
      custoBrl: String(r.custoBrl),
      cacheHit: r.cacheHit,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      quota,
      usoPorFeature: usoPorFeature as AiUsageByFeature[],
      ultimasChamadas,
      redisAtivo,
      anthropicConfigurado: this.isAnthropicConfigured(),
    };
  }

  async listarUso(
    tenantId: string,
    limit = 50,
    periodo?: string,
  ): Promise<AiUsageRow[]> {
    const p = periodo ?? this.quota.periodoAtual();
    const inicioMes = new Date(`${p}-01T00:00:00.000Z`);
    const n = Math.min(Math.max(limit, 1), 200);

    const rows = await this.drizzle.db
      .select()
      .from(aiUsage)
      .where(and(eq(aiUsage.tenantId, tenantId), gte(aiUsage.createdAt, inicioMes)))
      .orderBy(desc(aiUsage.createdAt))
      .limit(n);

    return rows.map((r) => ({
      id: r.id,
      feature: r.feature,
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      creditos: r.creditos,
      custoBrl: String(r.custoBrl),
      cacheHit: r.cacheHit,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
