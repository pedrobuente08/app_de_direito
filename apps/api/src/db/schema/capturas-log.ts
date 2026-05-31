import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const capturasLog = pgTable('capturas_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  oab: varchar('oab', { length: 20 }).notNull(),
  fonte: varchar('fonte', { length: 20 }).notNull(),
  iniciadoEm: timestamp('iniciado_em', { withTimezone: true }).notNull(),
  concluidoEm: timestamp('concluido_em', { withTimezone: true }),
  status: varchar('status', { length: 20 }).notNull(),
  totalItems: integer('total_items').default(0),
  novosItems: integer('novos_items').default(0),
  erroMsg: text('erro_msg'),
});
