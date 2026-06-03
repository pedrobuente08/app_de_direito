import {
  boolean,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';

export const parceiro = pgTable(
  'parceiro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    nome: varchar('nome', { length: 200 }).notNull(),
    tipo: varchar('tipo', { length: 10 }).notNull(),
    cpfCnpj: varchar('cpf_cnpj', { length: 18 }),
    comissaoPercentual: numeric('comissao_percentual', {
      precision: 5,
      scale: 2,
    }),
    corHex: varchar('cor_hex', { length: 7 }),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.escritorioId, t.nome)],
);

export const parceiroMateria = pgTable(
  'parceiro_materia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    parceiroId: uuid('parceiro_id')
      .notNull()
      .references(() => parceiro.id, { onDelete: 'cascade' }),
    materia: varchar('materia', { length: 100 }).notNull(),
  },
  (t) => [unique().on(t.escritorioId, t.materia)],
);
