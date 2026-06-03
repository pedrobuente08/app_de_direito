export const ENCADEAMENTO_EVENTOS = [
  'improcedente_recorrer',
  'procedente_reu_recorre',
  'extinto_sem_merito_com_custas',
  'extinto_sem_merito_sem_custas',
  'extinto_sem_merito_ma_fe',
  'transito_em_julgado',
  'alvara_expedido',
  'acordo_homologado',
  'pagamento_voluntario_expirado',
  'procedente_parcial_recorrer',
  'juizado_cliente_recorre',
  'decisao_monocratica',
  'decisao_colegiada',
  'vara_exigente_documento',
  'litigancia_ma_fe_detectada',
  'acordo_procuracao_solicitada',
  'embargos_interpostos_por_nos',
  'interlocutoria_tutela_deferida',
  'interlocutoria_tutela_indeferida',
  'interlocutoria_emenda_inicial',
  'interlocutoria_juntada_documentos',
  'interlocutoria_citacao_realizada',
  'interlocutoria_saneamento',
  'interlocutoria_outro',
  'tutela_deferida',
  'tutela_indeferida',
  'revisar_sobrestamento',
  'pagar_comissao_parceiro',
  'pje_contestacao_juntada',
  'pje_saneamento_publicado',
] as const;

export type EncadeamentoEvento = (typeof ENCADEAMENTO_EVENTOS)[number];

export type PendenciaEncadeamentoSpec = {
  tipo: string;
  dias: number;
  responsavel?: string | null;
  fila?: string | null;
};

export type CascataJobPayload = {
  escritorioId: string;
  evento: EncadeamentoEvento;
  processoId: string;
  observacao?: string | null;
};
