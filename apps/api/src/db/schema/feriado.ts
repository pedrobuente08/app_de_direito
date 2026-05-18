import { date, pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const feriado = pgTable(
  'feriado',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    data: date('data').notNull(),
    descricao: varchar('descricao', { length: 100 }),
    tipo: varchar('tipo', { length: 20 }),
  },
  (t) => [unique().on(t.escritorioId, t.data)],
);
