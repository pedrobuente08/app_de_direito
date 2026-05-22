import { sql } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export type Perfil =
  | 'admin'
  | 'adm'
  | 'advogado'
  | 'pautista'
  | 'leitura'
  | 'atendimento';

export const usuario = pgTable('usuario', {
  id: uuid('id').primaryKey().defaultRandom(),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 200 }).notNull().unique(),
  senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
  nome: varchar('nome', { length: 200 }),
  /** Aliases usados no nome do PDF → mesmo advogado que `nome` (skill `login_map`). */
  loginAliases: text('login_aliases')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  perfil: varchar('perfil', { length: 20 }).notNull().$type<Perfil>(),
  /** Advogado (ou outro) que também aparece no dropdown e na visão "Minhas" da Agenda. */
  ehPautista: boolean('eh_pautista').default(false).notNull(),
  oabs: text('oabs').array(),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
