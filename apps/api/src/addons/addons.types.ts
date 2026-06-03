import type { EscritorioAddonsConfig } from '../db/schema/escritorio';

export type AddonKey = keyof EscritorioAddonsConfig;

export const ADDON_LABELS: Record<AddonKey, string> = {
  recursos_avancados: 'Recursos avançados (embargos, interlocutórias)',
  workflows_raros: 'Workflows raros (tutela, falecido, sobrestamento)',
  captacao: 'Captação (parceiros e comissões)',
  execucao_avancada: 'Execução avançada (astreintes, SISBAJUD)',
  justica_comum_pje: 'Justiça Comum PJE',
};
