export type AiFeature =
  | 'RESUMO_ANDAMENTO'
  | 'TRADUCAO_WA'
  | 'EXTRACAO_FALLBACK'
  | 'JURIMETRIA_INSIGHT'
  | 'MINUTAS';

export type AiModel = 'haiku' | 'sonnet';

export type AiTaskPriority = 'realtime' | 'batch';

export type AiTask = {
  feature: AiFeature;
  payload: string;
  tenantId: string;
  userId: string;
  processoId?: string;
  conversaId?: string;
  maxTokens?: number;
  model?: AiModel;
  priority?: AiTaskPriority;
};

export type AiResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  custoBrl: number;
  creditos: number;
  cacheHit: boolean;
  latencyMs: number;
};

export type AiQuotaView = {
  periodo: string;
  periodoLabel?: string;
  plano: string;
  creditosTotal: number;
  creditosUsados: number;
  creditosRestantes: number;
  percentualUsado: number;
  overagePolicy: string;
};

export type AiUsageRow = {
  id: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  creditos: number;
  custoBrl: string;
  cacheHit: boolean;
  latencyMs: number | null;
  createdAt: string;
};

export type AiUsageByFeature = {
  feature: string;
  totalCreditos: number;
  totalChamadas: number;
};

export type AiHealthView = {
  quota: AiQuotaView;
  usoPorFeature: AiUsageByFeature[];
  ultimasChamadas: AiUsageRow[];
  redisAtivo: boolean;
  anthropicConfigurado: boolean;
};
