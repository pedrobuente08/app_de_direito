export type OnboardingJobPayload = {
  escritorioId: string;
  oab: string;
  ufOab: string;
  diasJanela: number;
  capturaLogId: string;
};

export type OnboardingRelatorio = {
  processosNovos: number;
  comunicacoesNovas: number;
  jaExistiam: number;
  erros: number;
};

export type OnboardingStatusView = {
  status: 'IDLE' | 'RUNNING' | 'DONE' | 'ERROR';
  progresso: { processado: number; total: number };
  relatorio: OnboardingRelatorio | null;
  erroMsg?: string | null;
};
