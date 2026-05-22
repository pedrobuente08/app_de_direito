/** Rótulos PT-BR para exibição de `fase_atual` (API / timeline). */
const FASE_LABELS: Record<string, string> = {
  AGUARDANDO_AUDIENCIA: 'Aguardando audiência',
  AGUARDANDO_SENTENCA: 'Aguardando sentença',
  AGUARDANDO_TRANSITO: 'Aguardando trânsito',
  AGUARDANDO_ALVARA: 'Aguardando alvará',
  AGUARDANDO_EXPEDICAO_ALVARA: 'Aguardando expedição do alvará',
  AGUARDANDO_PAGTO: 'Aguardando pagamento',
  AGUARDANDO_PROCURACAO: 'Aguardando procuração',
  AGUARDANDO_HIPOSSUFICIENCIA: 'Aguardando hipossuficiência',
  AGUARDANDO_DOC_GRATUIDADE: 'Aguardando doc. gratuidade',
  AGUARDANDO_DECISAO_GRATUIDADE: 'Aguardando decisão gratuidade',
  AGUARDANDO_ISENCAO_CUSTAS: 'Aguardando isenção de custas',
  EM_RECURSO: 'Em recurso',
  EM_REPROTOCOLO: 'Em reprotocolo',
  EM_AVALIACAO_RECURSO: 'Em avaliação de recurso',
  IMPROCEDENTE_SUCUMBENCIA: 'Improcedente — sucumbência',
  ENCERRADO: 'Encerrado',
  SOBRESTADO: 'Sobrestado',
};

export function faseDisplay(chave: string | null | undefined): string {
  if (!chave?.trim()) return '(sem fase)';
  const k = chave.trim();
  if (FASE_LABELS[k]) return FASE_LABELS[k];
  if (k.startsWith('PENDENCIA_')) {
    return `Pendência — ${k.slice('PENDENCIA_'.length).replace(/_/g, ' ')}`;
  }
  return k.replace(/_/g, ' ');
}
