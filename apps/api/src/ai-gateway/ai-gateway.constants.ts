import type { AiFeature, AiModel } from './ai-gateway.types';

export const MODEL_MATRIX: Record<AiFeature, AiModel> = {
  RESUMO_ANDAMENTO: 'haiku',
  TRADUCAO_WA: 'haiku',
  EXTRACAO_FALLBACK: 'sonnet',
  JURIMETRIA_INSIGHT: 'haiku',
  MINUTAS: 'sonnet',
};

export const MODEL_ID: Record<AiModel, string> = {
  haiku: 'claude-3-5-haiku-latest',
  sonnet: 'claude-sonnet-4-20250514',
};

export const SYSTEM_PROMPTS: Record<AiFeature, string> = {
  RESUMO_ANDAMENTO:
    'Você é assistente jurídico do escritório. Resuma andamentos processuais de forma objetiva em português brasileiro, destacando prazos e próximos passos.',
  TRADUCAO_WA:
    'Traduza mensagens jurídicas para linguagem clara ao cliente via WhatsApp. Mantenha tom profissional e empático. Responda só com o texto final.',
  EXTRACAO_FALLBACK:
    'Extraia dados estruturados de documentos jurídicos quando a extração determinística falhou. Retorne JSON válido conforme solicitado no prompt.',
  JURIMETRIA_INSIGHT:
    'Analise padrões processuais e produza insights concisos para advogados. Foque em riscos, tendências e recomendações acionáveis.',
  MINUTAS:
    'Redija minutas jurídicas em português brasileiro com rigor técnico. Siga o formato solicitado no prompt do usuário.',
};

/** Créditos mensais por plano (valores provisórios — §10 novoConectar). */
export const PLANO_CREDITOS: Record<string, number> = {
  autonomo: 500,
  escritorio: 2200,
  banca: 8000,
};

export const DEFAULT_PLANO = 'escritorio';

/** TTL do cache semântico (7 dias). */
export const AI_CACHE_TTL_SEC = 7 * 24 * 60 * 60;

/** 1 crédito ≈ R$ 0,01 de custo de inferência (ajustável). */
export const CREDITOS_POR_REAL = 100;
