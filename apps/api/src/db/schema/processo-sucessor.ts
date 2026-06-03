import {
  boolean,
  date,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { escritorio } from './escritorio';
import { processo } from './processo';

export const processoSucessor = pgTable('processo_sucessor', {
  id: uuid('id').primaryKey().defaultRandom(),
  processoId: uuid('processo_id')
    .notNull()
    .references(() => processo.id, { onDelete: 'cascade' }),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  nome: varchar('nome', { length: 300 }).notNull(),
  cpf: varchar('cpf', { length: 14 }),
  parentesco: varchar('parentesco', { length: 50 }),
  habilitado: boolean('habilitado').notNull().default(false),
  habilitadoEm: date('habilitado_em'),
  documentosRecebidos: jsonb('documentos_recebidos')
    .notNull()
    .default(sql`'[]'::jsonb`)
    .$type<string[]>(),
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
