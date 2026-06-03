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
import { sentenca } from './sentenca';

export const embargosDeclaracao = pgTable('embargos_declaracao', {
  id: uuid('id').primaryKey().defaultRandom(),
  sentencaId: uuid('sentenca_id')
    .notNull()
    .references(() => sentenca.id, { onDelete: 'cascade' }),
  processoId: uuid('processo_id')
    .notNull()
    .references(() => processo.id, { onDelete: 'cascade' }),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  origem: varchar('origem', { length: 10 }).notNull(),
  dataInterposicao: date('data_interposicao').notNull(),
  prazoJulgamento: date('prazo_julgamento'),
  resultado: varchar('resultado', { length: 30 }),
  dataJulgamento: date('data_julgamento'),
  observacoes: text('observacoes'),
  interrompePrazoRecurso: boolean('interrompe_prazo_recurso')
    .notNull()
    .default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
