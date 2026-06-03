import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';

export const tutelaAntecipada = pgTable('tutela_antecipada', {
  id: uuid('id').primaryKey().defaultRandom(),
  processoId: uuid('processo_id')
    .notNull()
    .references(() => processo.id, { onDelete: 'cascade' }),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  tipo: varchar('tipo', { length: 30 }).notNull(),
  pedidoEm: date('pedido_em').notNull(),
  resultado: varchar('resultado', { length: 30 }),
  dataResultado: date('data_resultado'),
  prazoCumprimento: date('prazo_cumprimento'),
  cumprida: boolean('cumprida').notNull().default(false),
  cumpridaEm: date('cumprida_em'),
  descricao: text('descricao'),
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
