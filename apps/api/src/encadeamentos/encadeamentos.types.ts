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
