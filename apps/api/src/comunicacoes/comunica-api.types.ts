/** Item da API pública DJEN (comunicaapi.pje.jus.br). */
export type ComunicaApiItem = {
  id: number;
  hash: string;
  data_disponibilizacao?: string;
  siglaTribunal?: string;
  tipoComunicacao?: string;
  numero_processo?: string;
  numeroprocessocommascara?: string;
  texto?: string;
  tipoDocumento?: string;
  nomeOrgao?: string;
  nomeParteAutora?: string;
  ativo?: boolean;
};

export type ComunicaApiResponse = {
  status: string;
  message: string;
  count: number;
  items: ComunicaApiItem[];
};
