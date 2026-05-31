export type {
  ComunicaApiItem,
  ComunicaApiResponse,
} from '../comunicacoes/comunica-api.types';

export type CapturaJobPayload = {
  escritorioId: string;
  oab: string;
  fonte: 'djen';
  tentativa: 'normal';
  capturaLogId: string;
};

export type CapturaResult = {
  capturaLogId: string;
  status: 'ok' | 'falha' | 'parcial';
  totalItems: number;
  novosItems: number;
  erroMsg?: string;
};

export type FonteSaudeView = {
  fonte: string;
  ultimoOkEm: string | null;
  ultimaFalhaEm: string | null;
  falhasConsecutivas: number;
  saudavel: boolean;
};

export type CapturaAlerta = {
  ativo: boolean;
  titulo: string;
  mensagem: string;
  fonte: string;
  falhasConsecutivas: number;
  ultimaFalhaEm: string | null;
};
