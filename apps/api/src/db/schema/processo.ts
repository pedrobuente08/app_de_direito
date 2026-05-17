import {
  boolean,
  date,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { escritorio } from './escritorio';
import { reu } from './reu';

/** JSON em `processo.avaliacao_recurso` (estado AVALIAR). */
export type AvaliacaoRecursoJson = {
  ativa?: boolean;
  criado_em?: string;
  prazo?: string;
  responsavel?: string;
  observacao?: string;
};

export const processo = pgTable(
  'processo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    escritorioId: uuid('escritorio_id')
      .notNull()
      .references(() => escritorio.id, { onDelete: 'cascade' }),
    numero: varchar('numero', { length: 30 }).notNull(),
    login: varchar('login', { length: 50 }),
    clienteNome: varchar('cliente_nome', { length: 300 }),
    clienteCpf: varchar('cliente_cpf', { length: 14 }),
    reuId: uuid('reu_id').references(() => reu.id),
    reuTexto: varchar('reu_texto', { length: 300 }),
    materia: varchar('materia', { length: 100 }),
    sistema: varchar('sistema', { length: 20 }).notNull(),
    vara: varchar('vara', { length: 50 }),
    dataDistribuicao: date('data_distribuicao'),
    dataAudiencia: date('data_audiencia'),
    horaAudiencia: time('hora_audiencia'),
    tipoAudiencia: varchar('tipo_audiencia', { length: 50 }),
    /** Marco amplo: ATIVO | SOBRESTADO | ARQUIVADO */
    statusProcesso: varchar('status_processo', { length: 20 })
      .notNull()
      .default('ATIVO'),
    faseAtual: varchar('fase_atual', { length: 50 }),
    qualidadeCaso: varchar('qualidade_caso', { length: 60 }),
    avaliacaoRecurso: jsonb('avaliacao_recurso').$type<AvaliacaoRecursoJson | null>(),
    justicaGratuita: boolean('justica_gratuita').default(false),
    situacaoFinal: varchar('situacao_final', { length: 50 }),
    telefone: varchar('telefone', { length: 20 }),
    statusAudiencia: varchar('status_audiencia', { length: 30 }),
    ultimaMovimentacaoDt: timestamp('ultima_movimentacao_dt', {
      withTimezone: true,
    }),
    ultimaMovimentacaoTipo: varchar('ultima_movimentacao_tipo', { length: 50 }),
    observacoes: text('observacoes'),
    requerConferencia: boolean('requer_conferencia').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.escritorioId, t.numero)],
);
