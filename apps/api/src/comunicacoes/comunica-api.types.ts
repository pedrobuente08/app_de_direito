/** Item da API pública DJEN (comunicaapi.pje.jus.br). */
export type ComunicaApiItem = {
  id: number;
  hash: string;
  data_disponibilizacao?: string;
  /** Formato alternativo retornado em alguns endpoints (DD/MM/YYYY). */
  datadisponibilizacao?: string;
  siglaTribunal?: string;
  tipoComunicacao?: string;
  numero_processo?: string;
  numeroprocessocommascara?: string;
  texto?: string;
  tipoDocumento?: string;
  nomeOrgao?: string;
  /** Sempre null na API — usar `destinatarios` para extrair o cliente. */
  nomeParteAutora?: string | null;
  ativo?: boolean;
  /** Partes do processo (polo A = autor/cliente, polo R = réu). */
  destinatarios?: Array<{ comunicacao_id?: number; nome: string; polo: string }>;
  /** Advogados destinatários. */
  destinatarioadvogados?: Array<{
    advogado: { nome: string; numero_oab: string; uf_oab: string };
  }>;
  /** Classe processual (ex.: "PROCEDIMENTO DO JUIZADO ESPECIAL CÍVEL"). */
  nomeClasse?: string;
  /** Link para o inteiro teor. */
  link?: string;
  numeroComunicacao?: number;
};

export type ComunicaApiResponse = {
  status: string;
  message: string;
  count: number;
  items: ComunicaApiItem[];
};
