import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const platformAdmin = pgTable('platform_admin', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 200 }).notNull().unique(),
  senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
  nome: varchar('nome', { length: 200 }),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
