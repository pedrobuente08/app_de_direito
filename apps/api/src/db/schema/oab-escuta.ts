import { pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const oabEscuta = pgTable(
  'oab_escuta',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    oab: varchar('oab', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.escritorioId, t.oab)],
);
