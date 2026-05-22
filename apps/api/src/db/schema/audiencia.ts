import {
  date,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { advogadoAdversario } from './advogado-adversario';
import { escritorioAdversario } from './escritorio-adversario';
import { processo } from './processo';

export const audiencia = pgTable(
  'audiencia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    processoId: uuid('processo_id')
      .notNull()
      .references(() => processo.id, { onDelete: 'restrict' }),
    escritorioAdversarioId: uuid('escritorio_adversario_id').references(
      () => escritorioAdversario.id,
      { onDelete: 'set null' },
    ),
    advogadoAdversarioId: uuid('advogado_adversario_id').references(
      () => advogadoAdversario.id,
      { onDelete: 'set null' },
    ),
    tipo: varchar('tipo', { length: 50 }),
    data: date('data').notNull(),
    hora: time('hora'),
    pautista: varchar('pautista', { length: 100 }),
    status: varchar('status', { length: 30 }).notNull().default('AGENDADA'),
    autorPresenca: varchar('autor_presenca', { length: 10 }),
    motivoAusencia: text('motivo_ausencia'),
    obsPre: text('obs_pre'),
    obsPos: text('obs_pos'),
    link: varchar('link', { length: 500 }),
    cenario: varchar('cenario', { length: 30 }),
    cenarioObservacao: text('cenario_observacao'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.escritorioId, t.processoId, t.data)],
);

export const audienciaHistorico = pgTable('audiencia_historico', {
  id: uuid('id').primaryKey().defaultRandom(),
  audienciaIdOrigem: uuid('audiencia_id_origem'),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  processoId: uuid('processo_id').notNull(),
  tipo: varchar('tipo', { length: 50 }),
  data: date('data').notNull(),
  hora: time('hora'),
  pautista: varchar('pautista', { length: 100 }),
  status: varchar('status', { length: 30 }).notNull(),
  obsPre: text('obs_pre'),
  obsPos: text('obs_pos'),
  link: varchar('link', { length: 500 }),
  createdAtOrigem: timestamp('created_at_origem', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const audienciaLixeira = pgTable('audiencia_lixeira', {
  id: uuid('id').primaryKey().defaultRandom(),
  audienciaIdOrigem: uuid('audiencia_id_origem'),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  processoId: uuid('processo_id').notNull(),
  tipo: varchar('tipo', { length: 50 }),
  data: date('data').notNull(),
  hora: time('hora'),
  pautista: varchar('pautista', { length: 100 }),
  status: varchar('status', { length: 30 }).notNull(),
  obsPre: text('obs_pre'),
  obsPos: text('obs_pos'),
  link: varchar('link', { length: 500 }),
  createdAtOrigem: timestamp('created_at_origem', { withTimezone: true }),
  discardedAt: timestamp('discarded_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
