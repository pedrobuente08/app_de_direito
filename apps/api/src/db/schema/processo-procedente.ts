import { sql } from 'drizzle-orm';
import {
  date,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { processo } from './processo';
import { usuario } from './usuario';

export const processoProcedente = pgTable('processo_procedente', {
  processoId: uuid('processo_id')
    .primaryKey()
    .references(() => processo.id, { onDelete: 'cascade' }),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  familiaSituacao: varchar('familia_situacao', { length: 30 }).notNull(),
  situacao: varchar('situacao', { length: 60 }).notNull(),
  recursoTipo: varchar('recurso_tipo', { length: 20 }),
  recursoOrigem: varchar('recurso_origem', { length: 10 }),
  recursoResultado: varchar('recurso_resultado', { length: 20 }),
  docPendente: jsonb('doc_pendente')
    .notNull()
    .default(sql`'[]'::jsonb`)
    .$type<string[]>(),
  responsavel: varchar('responsavel', { length: 100 }),
  obsCurta: text('obs_curta'),
  ultimoVisto: timestamp('ultimo_visto', { withTimezone: true }),
  dataEstimadaRecebimento: date('data_estimada_recebimento'),
  valorRecebido: numeric('valor_recebido', { precision: 12, scale: 2 }),
  dataRecebimento: date('data_recebimento'),
  dataProtocoloAlvara: date('data_protocolo_alvara'),
  dataAlvaraExpedido: date('data_alvara_expedido'),
  dataPeticaoCumprimento: date('data_peticao_cumprimento'),
  dataPenhoraRealizada: date('data_penhora_realizada'),
  valorPenhorado: numeric('valor_penhorado', { precision: 12, scale: 2 }),
  penhoraOrigem: varchar('penhora_origem', { length: 50 }),
  observacoesExecucao: text('observacoes_execucao'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const procedenteTransicao = pgTable('procedente_transicao', {
  id: uuid('id').primaryKey().defaultRandom(),
  processoId: uuid('processo_id')
    .notNull()
    .references(() => processo.id, { onDelete: 'cascade' }),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  situacaoAnterior: varchar('situacao_anterior', { length: 60 }),
  situacaoNova: varchar('situacao_nova', { length: 60 }).notNull(),
  origem: varchar('origem', { length: 20 }).notNull(),
  usuarioId: uuid('usuario_id').references(() => usuario.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
