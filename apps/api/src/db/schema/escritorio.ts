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
  /** @deprecated usar `status_processo` (3 valores fixos no produto). */
  situacao?: string[];
  /** ATIVO | SOBRESTADO | ARQUIVADO — opções exibidas na UI. */
  status_processo?: string[];
  sentenca?: string[];
  fase_atual?: string[];
};

export type EscritorioConfig = {
  mapa_comarcas?: Record<string, string>;
  login_map?: Record<string, string>;
  materias_validas?: string[];
  fase_inicial?: string;
  situacao_inicial?: string;
  /** Preferência sobre `situacao_inicial` para novos processos. */
  status_processo_inicial?: string;
  /** Opções de edição rápida na web (uma lista por campo). */
  dropdowns_processo?: DropdownsProcessoConfig;
  comunica_regras?: Record<string, unknown>;
  /** Token opcional para validar `POST /comunicacoes/webhook`. */
  comunica_webhook_token?: string;
  /** Resumo por e-mail (cron diário ~7h). */
  comunica_digest?: ComunicaDigestConfig;
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
