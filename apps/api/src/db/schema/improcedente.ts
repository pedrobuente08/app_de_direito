import {
  boolean,
  date,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';

export const improcedente = pgTable('improcedente', {
  id: uuid('id').primaryKey().defaultRandom(),
  processoId: uuid('processo_id')
    .notNull()
    .references(() => processo.id, { onDelete: 'cascade' }),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  valorSucumbencia: numeric('valor_sucumbencia', {
    precision: 12,
    scale: 2,
  }),
  destinatarioSucumbencia: varchar('destinatario_sucumbencia', {
    length: 300,
  }),
  statusPagamento: varchar('status_pagamento', { length: 30 })
    .notNull()
    .default('A_PAGAR'),
  dataPrazoPagamento: date('data_prazo_pagamento'),
  dataPagamento: date('data_pagamento'),
  decisaoRecurso: varchar('decisao_recurso', { length: 20 }),
  certidaoCreditoSolicitada: boolean('certidao_credito_solicitada')
    .notNull()
    .default(false),
  certidaoCreditoData: date('certidao_credito_data'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
