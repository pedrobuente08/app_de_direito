import { pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const reu = pgTable(
  'reu',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    nomeCanonico: varchar('nome_canonico', { length: 300 }).notNull(),
    cnpj: varchar('cnpj', { length: 18 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.escritorioId, t.nomeCanonico)],
);
