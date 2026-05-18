import {
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';

export const sentenca = pgTable(
  'sentenca',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    processoId: uuid('processo_id')
      .notNull()
      .references(() => processo.id, { onDelete: 'cascade' }),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    grau: varchar('grau', { length: 20 }).notNull(),
    data: date('data').notNull(),
    valor: numeric('valor', { precision: 12, scale: 2 }),
    resultado: varchar('resultado', { length: 40 }).notNull(),
    favoravelPara: varchar('favoravel_para', { length: 10 }).notNull(),
    turma: varchar('turma', { length: 50 }),
    assessorJulgador: varchar('assessor_julgador', { length: 100 }),
    turnoJulgamento: varchar('turno_julgamento', { length: 20 }),
    extincaoModalidade: varchar('extincao_modalidade', { length: 20 }),
    motivoExtincao: varchar('motivo_extincao', { length: 100 }),
    observacoes: text('observacoes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_sentenca_processo').on(t.processoId),
    index('idx_sentenca_escritorio').on(t.escritorioId, t.data),
  ],
);
