import { pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const comarca = pgTable(
  'comarca',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    codigo: varchar('codigo', { length: 10 }).notNull(),
    nome: varchar('nome', { length: 100 }).notNull(),
    abreviado: varchar('abreviado', { length: 30 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.escritorioId, t.codigo)],
);
