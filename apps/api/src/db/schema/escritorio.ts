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

export type EscritorioConfig = {
  mapa_comarcas?: Record<string, string>;
  login_map?: Record<string, string>;
  materias_validas?: string[];
  fase_inicial?: string;
  situacao_inicial?: string;
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
