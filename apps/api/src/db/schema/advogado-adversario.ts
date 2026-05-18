import {
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { escritorioAdversario } from './escritorio-adversario';

export const advogadoAdversario = pgTable(
  'advogado_adversario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    escritorioAdversarioId: uuid('escritorio_adversario_id').references(
      () => escritorioAdversario.id,
      { onDelete: 'set null' },
    ),
    nomeCanonico: varchar('nome_canonico', { length: 300 }).notNull(),
    oab: varchar('oab', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.escritorioId, t.nomeCanonico)],
);

export const advogadoAdversarioAlias = pgTable('advogado_adversario_alias', {
  id: uuid('id').primaryKey().defaultRandom(),
  advogadoAdversarioId: uuid('advogado_adversario_id')
    .notNull()
    .references(() => advogadoAdversario.id, { onDelete: 'cascade' }),
  alias: varchar('alias', { length: 300 }).notNull(),
});
