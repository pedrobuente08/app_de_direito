import {
  boolean,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/** Digest automático de comunicações (e-mail diário via cron). */
export type ComunicaDigestConfig = {
  enabled?: boolean;
  /** Destinatários (e-mails). Requer SMTP configurado na API. */
  emails?: string[];
  /** Janela em dias para o resumo (default 1 = últimas 24h). */
  dias?: number;
};

/** Listas opcionais para dropdowns na grid de processos (Intimações). */
export type DropdownsProcessoConfig = {
  /** Valores de `qualidade_caso` (coluna Situação na grade Intimações). */
  situacao?: string[];
  /** ATIVO | SOBRESTADO | ARQUIVADO — opções exibidas na UI. */
  status_processo?: string[];
  sentenca?: string[];
  fase_atual?: string[];
};

export type EscritorioConfig = {
  materias_validas?: string[];
  fase_inicial?: string;
  situacao_inicial?: string;
  /** Preferência sobre `situacao_inicial` para novos processos. */
  status_processo_inicial?: string;
  /** Opções de edição rápida na web (uma lista por campo). */
  dropdowns_processo?: DropdownsProcessoConfig;
  /** Mapa fase_anterior → fases permitidas (edição manual). */
  transicoes_fase?: Record<string, string[]>;
  /** Prazo do estado AVALIAR após sentença improcedente (default 7). */
  prazo_avaliacao_recurso_dias?: number;
  /** Prazo da pendência “elaborar recurso” ao optar RECORRER (default 10). */
  prazo_elaborar_recurso_dias?: number;
  comunica_regras?: Record<string, unknown>;
  /** Token opcional para validar `POST /comunicacoes/webhook`. */
  comunica_webhook_token?: string;
  /** Resumo por e-mail (cron diário ~7h). */
  comunica_digest?: ComunicaDigestConfig;
  /** Tipos exibidos ao criar pendência manual. */
  tipos_pendencia?: string[];
  /** Fatores de provisão (%), ex.: 60, 85, 100. */
  fatores_provisao_pct?: number[];
  /** Ativação por evento de encadeamento automático (default: ligado). */
  encadeamentos?: Partial<Record<string, boolean>>;
  /** Cálculo de prazos de pendências automáticas. */
  prazo_processual_tipo?: 'DIAS_UTEIS' | 'CORRIDOS';
};

export const escritorio = pgTable('escritorio', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 200 }).notNull(),
  cnpj: varchar('cnpj', { length: 18 }).unique(),
  config: jsonb('config').notNull().default({}).$type<EscritorioConfig>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  ativo: boolean('ativo').default(true).notNull(),
});
