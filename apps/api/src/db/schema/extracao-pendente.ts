import {
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

export const extracaoPendente = pgTable('extracao_pendente', {
  id: uuid('id').primaryKey().defaultRandom(),
  escritorioId: uuid('escritorio_id')
    .notNull()
    .references(() => escritorio.id, { onDelete: 'cascade' }),
  arquivoNome: varchar('arquivo_nome', { length: 255 }).notNull(),
  arquivoStorageKey: varchar('arquivo_storage_key', { length: 500 }),
  textoExtraido: text('texto_extraido').notNull(),
  resultadoSkill: jsonb('resultado_skill').notNull(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }).notNull(),
  alerta: varchar('alerta', { length: 50 }),
  revisaoStatus: varchar('revisao_status', { length: 20 })
    .notNull()
    .default('PENDENTE'),
  sugestaoIa: jsonb('sugestao_ia'),
  revisadoPor: uuid('revisado_por').references(() => usuario.id),
  revisadoEm: timestamp('revisado_em', { withTimezone: true }),
  processoId: uuid('processo_id').references(() => processo.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
