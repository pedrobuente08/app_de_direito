import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { pendencia } from './pendencia';
import { processo } from './processo';

export const comunicacao = pgTable('comunicacao', {
  id: uuid('id').primaryKey().defaultRandom(),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  processoId: uuid('processo_id').references(() => processo.id, {
    onDelete: 'set null',
  }),
  oab: varchar('oab', { length: 20 }).notNull(),
  numeroProcessoBruto: varchar('numero_processo_bruto', { length: 30 }),
  tipo: varchar('tipo', { length: 50 }),
  resumo: text('resumo'),
  conteudoCompleto: text('conteudo_completo'),
  dataDisponibilizacao: timestamp('data_disponibilizacao', {
    withTimezone: true,
  }),
  pendenciaGeradaId: uuid('pendencia_gerada_id').references(() => pendencia.id, {
    onDelete: 'set null',
  }),
  status: varchar('status', { length: 20 }).notNull().default('NAO_LIDA'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
