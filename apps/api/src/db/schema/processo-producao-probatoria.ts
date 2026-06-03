import {
  date,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';

export const processoProducaoProbatoria = pgTable('processo_producao_probatoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  processoId: uuid('processo_id')
    .notNull()
    .references(() => processo.id, { onDelete: 'cascade' }),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  tipo: varchar('tipo', { length: 40 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('AGUARDANDO'),
  dataDesignacao: date('data_designacao'),
  dataConclusao: date('data_conclusao'),
  peritoNome: varchar('perito_nome', { length: 200 }),
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
