import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';
import { usuario } from './usuario';

export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => usuario.id, { onDelete: 'set null' }),
  feature: text('feature').notNull(),
  provider: text('provider').notNull().default('anthropic'),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
  cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
  custoBrl: numeric('custo_brl', { precision: 10, scale: 6 }).notNull(),
  creditos: integer('creditos').notNull(),
  cacheHit: boolean('cache_hit').notNull().default(false),
  latencyMs: integer('latency_ms'),
  processoId: uuid('processo_id').references(() => processo.id, {
    onDelete: 'set null',
  }),
  conversaId: uuid('conversa_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
