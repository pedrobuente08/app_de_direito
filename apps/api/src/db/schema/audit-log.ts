import { jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { usuario } from './usuario';

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  escritorioId: uuid('escritorio_id').references(() => escritorio.id, {
    onDelete: 'set null',
  }),
  usuarioId: uuid('usuario_id').references(() => usuario.id, {
    onDelete: 'set null',
  }),
  entidade: varchar('entidade', { length: 50 }).notNull(),
  entidadeId: varchar('entidade_id', { length: 50 }).notNull(),
  acao: varchar('acao', { length: 20 }).notNull(),
  diff: jsonb('diff').$type<Record<string, unknown>>(),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
