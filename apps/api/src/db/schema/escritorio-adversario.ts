import {
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const escritorioAdversario = pgTable(
  'escritorio_adversario',
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

export const escritorioAdversarioAlias = pgTable(
  'escritorio_adversario_alias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioAdversarioId: uuid('escritorio_adversario_id')
      .notNull()
      .references(() => escritorioAdversario.id, { onDelete: 'cascade' }),
    alias: varchar('alias', { length: 300 }).notNull(),
  },
);
