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
};
