import { pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { reu } from './reu';

export const reuAlias = pgTable(
  'reu_alias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reuId: uuid('reu_id')
      .notNull()
      .references(() => reu.id, { onDelete: 'cascade' }),
    alias: varchar('alias', { length: 300 }).notNull(),
  },
  (t) => [unique().on(t.reuId, t.alias)],
);
