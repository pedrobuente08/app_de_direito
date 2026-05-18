import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { usuario } from './usuario';

export const notificacao = pgTable(
  'notificacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),
    fila: varchar('fila', { length: 30 }),
    tipoGatilho: varchar('tipo_gatilho', { length: 50 }),
    entidade: varchar('entidade', { length: 50 }),
    entidadeId: uuid('entidade_id'),
    canal: varchar('canal', { length: 20 }),
    prioridade: varchar('prioridade', { length: 10 }),
    conteudo: jsonb('conteudo').$type<Record<string, unknown> | null>(),
    lidaEm: timestamp('lida_em', { withTimezone: true }),
    agendadaPara: timestamp('agendada_para', { withTimezone: true }),
    enviadaEm: timestamp('enviada_em', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('idx_notificacao_escritorio').on(t.escritorioId, t.createdAt),
  ],
);
