import type { EncadeamentoEvento, PendenciaEncadeamentoSpec } from './encadeamentos.types';

export const ENCADEAMENTO_PENDENCIAS: Record<
  EncadeamentoEvento,
  PendenciaEncadeamentoSpec[]
> = {
  improcedente_recorrer: [
    { tipo: 'ELABORAR RECURSO', dias: 10, responsavel: 'ADV', fila: 'ADV' },
    {
      tipo: 'SOLICITAR DOC GRATUIDADE',
      dias: 5,
      responsavel: 'ATENDIMENTO',
      fila: 'ATENDIMENTO',
    },
  ],
  procedente_reu_recorre: [
    { tipo: 'ELABORAR CONTRARRAZOES', dias: 10, responsavel: 'ADV', fila: 'ADV' },
  ],
  extinto_sem_merito_com_custas: [
    {
      tipo: 'PETICIONAR ISENCAO CUSTAS',
      dias: 15,
      responsavel: 'ADV',
      fila: 'ADV',
    },
  ],
  extinto_sem_merito_sem_custas: [
    { tipo: 'ANALISE REPROTOCOLO', dias: 7, responsavel: 'ADV', fila: 'ADV' },
  ],
  extinto_sem_merito_ma_fe: [
    { tipo: 'ELABORAR RECURSO', dias: 10, responsavel: 'ADV', fila: 'ADV' },
  ],
  transito_em_julgado: [
    { tipo: 'PETICIONAR DADOS ALVARA', dias: 5, responsavel: 'ADV', fila: 'ADV' },
  ],
  alvara_expedido: [
    { tipo: 'VERIFICAR PAGAMENTO', dias: 30, responsavel: 'ADV', fila: 'ADV' },
  ],
  acordo_homologado: [
    {
      tipo: 'VERIFICAR CUMPRIMENTO ACORDO',
      dias: 60,
      responsavel: 'ADV',
      fila: 'ADV',
    },
  ],
  pagamento_voluntario_expirado: [
    {
      tipo: 'PETICIONAR CUMPRIMENTO SENTENCA',
      dias: 5,
      responsavel: 'ADV',
      fila: 'ADV',
    },
  ],
  procedente_parcial_recorrer: [
    { tipo: 'ELABORAR RECURSO', dias: 10, responsavel: 'ADV', fila: 'ADV' },
    {
      tipo: 'SOLICITAR DOC GRATUIDADE',
      dias: 5,
      responsavel: 'ATENDIMENTO',
      fila: 'ATENDIMENTO',
    },
  ],
  juizado_cliente_recorre: [
    { tipo: 'ELABORAR RECURSO', dias: 10, responsavel: 'ADV', fila: 'ADV' },
    {
      tipo: 'SOLICITAR DOC HIPOSSUFICIENCIA',
      dias: 5,
      responsavel: 'ATENDIMENTO',
      fila: 'ATENDIMENTO',
    },
  ],
  decisao_monocratica: [
    {
      tipo: 'ELABORAR EMBARGOS DECLARACAO',
      dias: 5,
      responsavel: 'ADV',
      fila: 'ADV',
    },
    {
      tipo: 'ELABORAR AGRAVO INTERNO',
      dias: 10,
      responsavel: 'ADV',
      fila: 'ADV',
    },
  ],
  decisao_colegiada: [
    {
      tipo: 'ELABORAR EMBARGOS DECLARACAO',
      dias: 5,
      responsavel: 'ADV',
      fila: 'ADV',
    },
  ],
  vara_exigente_documento: [
    {
      tipo: 'SOLICITAR_DOC_CONFORME_VARA',
      dias: 5,
      responsavel: null,
      fila: 'ATENDIMENTO',
    },
  ],
  litigancia_ma_fe_detectada: [
    {
      tipo: 'MONITORAR_PROCESSO_MA_FE',
      dias: 15,
      responsavel: null,
      fila: 'ADV',
    },
    {
      tipo: 'CONTATO_URGENTE_CLIENTE_MA_FE',
      dias: 3,
      responsavel: null,
      fila: 'ATENDIMENTO',
    },
  ],
  acordo_procuracao_solicitada: [
    {
      tipo: 'SOLICITAR_NOVA_PROCURACAO',
      dias: 5,
      responsavel: null,
      fila: 'ATENDIMENTO',
    },
  ],
  embargos_interpostos_por_nos: [
    {
      tipo: 'ELABORAR_EMBARGOS_DECLARACAO',
      dias: 5,
      responsavel: null,
      fila: 'ADV',
    },
  ],
  interlocutoria_tutela_deferida: [
    { tipo: 'MONITORAR_TUTELA', dias: 30, responsavel: null, fila: 'ADV' },
  ],
  interlocutoria_tutela_indeferida: [
    { tipo: 'AVALIAR_AGRAVO_INSTRUMENTO', dias: 5, responsavel: null, fila: 'ADV' },
  ],
  interlocutoria_emenda_inicial: [
    { tipo: 'EMENDAR_INICIAL', dias: 10, responsavel: null, fila: 'ADV' },
  ],
  interlocutoria_juntada_documentos: [
    { tipo: 'JUNTAR_DOCUMENTOS', dias: 5, responsavel: null, fila: 'ADV' },
    {
      tipo: 'SOLICITAR_DOCUMENTOS_CLIENTE',
      dias: 3,
      responsavel: null,
      fila: 'ATENDIMENTO',
    },
  ],
  interlocutoria_citacao_realizada: [
    { tipo: 'ACOMPANHAR_CONTESTACAO', dias: 15, responsavel: null, fila: 'ADV' },
  ],
  interlocutoria_saneamento: [
    { tipo: 'RESPONDER_SANEAMENTO', dias: 15, responsavel: null, fila: 'ADV' },
  ],
  interlocutoria_outro: [
    {
      tipo: 'ANALISAR_DECISAO_INTERLOCUTORIA',
      dias: 5,
      responsavel: null,
      fila: 'ADV',
    },
  ],
  tutela_deferida: [
    { tipo: 'MONITORAR_CUMPRIMENTO_TUTELA', dias: 10, responsavel: null, fila: 'ADV' },
    { tipo: 'VERIFICAR_CUMPRIMENTO_TUTELA', dias: 30, responsavel: null, fila: 'ADV' },
  ],
  tutela_indeferida: [
    { tipo: 'AVALIAR_AGRAVO_INSTRUMENTO', dias: 5, responsavel: null, fila: 'ADV' },
  ],
  revisar_sobrestamento: [
    { tipo: 'REVISAR_SOBRESTAMENTO', dias: 180, responsavel: null, fila: 'ADV' },
  ],
  pagar_comissao_parceiro: [
    { tipo: 'PAGAR_COMISSAO_PARCEIRO', dias: 30, responsavel: null, fila: 'FINANCEIRO' },
  ],
  pje_contestacao_juntada: [
    { tipo: 'ELABORAR_REPLICA', dias: 15, responsavel: null, fila: 'ADV' },
  ],
  pje_saneamento_publicado: [
    { tipo: 'RESPONDER_SANEAMENTO', dias: 15, responsavel: null, fila: 'ADV' },
  ],
};
