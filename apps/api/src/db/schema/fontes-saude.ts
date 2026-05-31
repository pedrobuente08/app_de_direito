import { integer, pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const fontesSaude = pgTable(
  'fontes_saude',
  {
    fonte: varchar('fonte', { length: 20 }).notNull(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    ultimoOkEm: timestamp('ultimo_ok_em', { withTimezone: true }),
    ultimaFalhaEm: timestamp('ultima_falha_em', { withTimezone: true }),
    falhasConsecutivas: integer('falhas_consecutivas').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.fonte, t.escritorioId] })],
);
