import { date, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';

export const processoReprotocolo = pgTable('processo_reprotocolo', {
  processoId: uuid('processo_id')
    .primaryKey()
    .references(() => processo.id, { onDelete: 'cascade' }),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  subEstado: varchar('sub_estado', { length: 50 }),
  motivoExtincao: varchar('motivo_extincao', { length: 100 }),
  modalidadeExtincao: varchar('modalidade_extincao', { length: 20 }),
  dataExtincao: date('data_extincao'),
  dataIsencaoPedida: date('data_isencao_pedida'),
  dataIsencaoResultado: varchar('data_isencao_resultado', { length: 20 }),
  dataReprotocolo: date('data_reprotocolo'),
  processoNovoId: uuid('processo_novo_id').references(() => processo.id, {
    onDelete: 'set null',
  }),
  observacoes: text('observacoes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
