import {
  date,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';

export const pendencia = pgTable(
  'pendencia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    processoId: uuid('processo_id')
      .notNull()
      .references(() => processo.id, { onDelete: 'restrict' }),
    tipo: varchar('tipo', { length: 50 }).notNull(),
    dataAbertura: date('data_abertura').notNull(),
    dataLimite: date('data_limite'),
    solicitante: varchar('solicitante', { length: 100 }),
    responsavel: varchar('responsavel', { length: 100 }),
    status: varchar('status', { length: 30 }).notNull().default('ABERTA'),
    dataCumprimento: date('data_cumprimento'),
    observacao: text('observacao'),
    origem: varchar('origem', { length: 20 })
      .notNull()
      .default('MANUAL_INTIMACOES'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.escritorioId, t.processoId, t.tipo, t.dataAbertura)],
);

export const pendenciaHistorico = pgTable('pendencia_historico', {
  id: uuid('id').primaryKey().defaultRandom(),
  pendenciaIdOrigem: uuid('pendencia_id_origem'),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  processoId: uuid('processo_id').notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(),
  dataAbertura: date('data_abertura').notNull(),
  dataLimite: date('data_limite'),
  solicitante: varchar('solicitante', { length: 100 }),
  responsavel: varchar('responsavel', { length: 100 }),
  status: varchar('status', { length: 30 }).notNull(),
  dataCumprimento: date('data_cumprimento'),
  observacao: text('observacao'),
  origem: varchar('origem', { length: 20 }).notNull(),
  createdAtOrigem: timestamp('created_at_origem', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const pendenciaProblema = pgTable('pendencia_problema', {
  id: uuid('id').primaryKey().defaultRandom(),
  pendenciaIdOrigem: uuid('pendencia_id_origem'),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  processoId: uuid('processo_id').notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(),
  dataAbertura: date('data_abertura').notNull(),
  dataLimite: date('data_limite'),
  solicitante: varchar('solicitante', { length: 100 }),
  responsavel: varchar('responsavel', { length: 100 }),
  status: varchar('status', { length: 30 }).notNull(),
  observacao: text('observacao'),
  origem: varchar('origem', { length: 20 }).notNull(),
  createdAtOrigem: timestamp('created_at_origem', { withTimezone: true }),
  movedAt: timestamp('moved_at', { withTimezone: true }).defaultNow().notNull(),
});
