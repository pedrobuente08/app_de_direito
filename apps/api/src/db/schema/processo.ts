import {
  boolean,
  date,
  index,
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
    faseUpdatedAt: timestamp('fase_updated_at', { withTimezone: true }),
    reveliaDecretada: boolean('revelia_decretada').notNull().default(false),
    litiganciaMaFe: boolean('litigancia_ma_fe').notNull().default(false),
    hipossuficienciaComprovada: boolean('hipossuficiencia_comprovada')
      .notNull()
      .default(false),
    varaExigeDocFrequente: boolean('vara_exige_doc_frequente')
      .notNull()
      .default(false),
    reuOrgaoPublico: boolean('reu_orgao_publico').notNull().default(false),
    dajeEmitido: boolean('daje_emitido').notNull().default(false),
    dajeValor: numeric('daje_valor', { precision: 12, scale: 2 }),
    dajeDataEmissao: date('daje_data_emissao'),
    dajeStatus: varchar('daje_status', { length: 30 }),
    dajeDataPedidoIsencao: date('daje_data_pedido_isencao'),
    dajeDataPagamento: date('daje_data_pagamento'),
    tipoCr: varchar('tipo_cr', { length: 50 }),
    dataTransito: date('data_transito'),
    qualidadeCaso: varchar('qualidade_caso', { length: 60 }),
    avaliacaoRecurso: jsonb('avaliacao_recurso').$type<AvaliacaoRecursoJson | null>(),
    justicaGratuita: boolean('justica_gratuita').default(false),
    justicaGratuitaConcedidaEm: date('justica_gratuita_concedida_em'),
    justicaGratuitaExpiraEm: date('justica_gratuita_expira_em'),
    justicaGratuitaRevisadaEm: date('justica_gratuita_revisada_em'),
    sucumbenciaDevida: boolean('sucumbencia_devida').default(false),
    honorarioSucumbencialValor: varchar('honorario_sucumbencial_valor', {
      length: 30,
    }),
    honorarioSucumbencialStatus: varchar('honorario_sucumbencial_status', {
      length: 20,
    }),
    honorarioSucumbencialPagoEm: date('honorario_sucumbencial_pago_em'),
    sobrestamentoMotivo: text('sobrestamento_motivo'),
    sobrestadoDesde: date('sobrestado_desde'),
    recursoAdversario: boolean('recurso_adversario').default(false),
    parceiroEscritorio: varchar('parceiro_escritorio', { length: 200 }),
    situacaoFinal: varchar('situacao_final', { length: 50 }),
    telefone: varchar('telefone', { length: 20 }),
    statusAudiencia: varchar('status_audiencia', { length: 30 }),
    ultimaMovimentacaoDt: timestamp('ultima_movimentacao_dt', {
      withTimezone: true,
    }),
    ultimaMovimentacaoTipo: varchar('ultima_movimentacao_tipo', { length: 50 }),
    /** @deprecated Preferir `observacaoGeral`. */
    observacoes: text('observacoes'),
    observacaoGeral: text('observacao_geral'),
    requerConferencia: boolean('requer_conferencia').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique().on(t.escritorioId, t.numero),
    index('idx_processo_escritorio_status').on(t.escritorioId, t.statusProcesso),
    index('idx_processo_escritorio_fase').on(t.escritorioId, t.faseAtual),
    index('idx_processo_escritorio_updated').on(t.escritorioId, t.updatedAt),
  ],
);
