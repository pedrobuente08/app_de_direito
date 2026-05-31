import { index, pgTable, serial, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';
import { usuario } from './usuario';

export const statusHistorico = pgTable(
  'status_historico',
  {
    id: serial('id').primaryKey(),
    processoId: uuid('processo_id')
      .notNull()
      .references(() => processo.id, { onDelete: 'cascade' }),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    statusAnterior: varchar('status_anterior', { length: 20 }),
    statusNovo: varchar('status_novo', { length: 20 }).notNull(),
    /** 'MANUAL' | 'SISTEMA' */
    origem: varchar('origem', { length: 20 }).notNull().default('MANUAL'),
    usuarioId: uuid('usuario_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('idx_status_historico_processo').on(t.processoId)],
);
