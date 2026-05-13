import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { audiencia } from './audiencia';
import { escritorio } from './escritorio';
import { processo } from './processo';

export const audienciaAusente = pgTable('audiencia_ausente', {
  id: uuid('id').primaryKey().defaultRandom(),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  audienciaId: uuid('audiencia_id').references(() => audiencia.id, {
    onDelete: 'set null',
  }),
  processoId: uuid('processo_id')
    .notNull()
    .references(() => processo.id, { onDelete: 'cascade' }),
  numeroProcesso: varchar('numero_processo', { length: 30 }).notNull(),
  clienteNome: varchar('cliente_nome', { length: 300 }),
  reuId: uuid('reu_id'),
  materia: varchar('materia', { length: 100 }),
  vara: varchar('vara', { length: 50 }),
  qualidadeCaso: varchar('qualidade_caso', { length: 60 }),
  dataAudiencia: date('data_audiencia').notNull(),
  motivoAusencia: text('motivo_ausencia').notNull(),
  reaproveitavel: boolean('reaproveitavel'),
  reaproveitadoEm: date('reaproveitado_em'),
  observacoesRevisao: text('observacoes_revisao'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
