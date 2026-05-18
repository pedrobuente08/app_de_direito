import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const varaDocumentoRegra = pgTable(
  'vara_documento_regra',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    vara: varchar('vara', { length: 50 }).notNull(),
    tipoDocumento: varchar('tipo_documento', { length: 50 }),
    formatoDocumento: varchar('formato_documento', { length: 50 }),
    aceita: boolean('aceita').notNull(),
    observacao: text('observacao'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('idx_vara_doc_regra_escritorio').on(t.escritorioId, t.vara)],
);
