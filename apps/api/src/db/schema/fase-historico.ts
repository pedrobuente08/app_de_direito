import {
  index,
  pgTable,
  serial,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';
import { usuario } from './usuario';

export const faseHistorico = pgTable(
  'fase_historico',
  {
    id: serial('id').primaryKey(),
    processoId: uuid('processo_id')
      .notNull()
      .references(() => processo.id, { onDelete: 'cascade' }),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    faseAnterior: varchar('fase_anterior', { length: 50 }),
    faseNova: varchar('fase_nova', { length: 50 }).notNull(),
    origem: varchar('origem', { length: 20 }).notNull(),
    usuarioId: uuid('usuario_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('idx_fase_historico_processo').on(t.processoId)],
);
