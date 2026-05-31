import { integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const aiQuota = pgTable('ai_quota', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  periodo: text('periodo').notNull(),
  plano: text('plano').notNull(),
  creditosTotal: integer('creditos_total').notNull(),
  creditosUsados: integer('creditos_usados').notNull().default(0),
  overagePolicy: text('overage_policy').notNull().default('block'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique('ai_quota_tenant_periodo').on(t.tenantId, t.periodo)]);
