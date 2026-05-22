/** Valores canônicos de `processo.fase_atual` (UPPER_SNAKE_CASE — Sprint A PLANO_FINAL). */
export const FaseDerivada = {
  AGUARDANDO_PROCURACAO: 'AGUARDANDO_PROCURACAO',
  EM_RECURSO: 'EM_RECURSO',
  AGUARDANDO_AUDIENCIA: 'AGUARDANDO_AUDIENCIA',
  AGUARDANDO_SENTENCA: 'AGUARDANDO_SENTENCA',
  AGUARDANDO_TRANSITO: 'AGUARDANDO_TRANSITO',
  AGUARDANDO_ALVARA: 'AGUARDANDO_ALVARA',
} as const;

export type FaseDerivadaKey = keyof typeof FaseDerivada;

/** Mapeamento de valores legados (texto livre) → chave canônica. */
export const LEGACY_FASE_TO_CANONICAL: Record<string, string> = {
  'AUDIÊNCIA AGENDADA': FaseDerivada.AGUARDANDO_AUDIENCIA,
  'AUDIENCIA AGENDADA': FaseDerivada.AGUARDANDO_AUDIENCIA,
  'AGUARDANDO AUDIÊNCIA': FaseDerivada.AGUARDANDO_AUDIENCIA,
  'AGUARDANDO AUDIENCIA': FaseDerivada.AGUARDANDO_AUDIENCIA,
  'AGUARDANDO PROCURAÇÃO': FaseDerivada.AGUARDANDO_PROCURACAO,
  'AGUARDANDO PROCURACAO': FaseDerivada.AGUARDANDO_PROCURACAO,
  'AGUARDANDO SENTENÇA': FaseDerivada.AGUARDANDO_SENTENCA,
  'AGUARDANDO SENTENCA': FaseDerivada.AGUARDANDO_SENTENCA,
  'AGUARDANDO TRÂNSITO': FaseDerivada.AGUARDANDO_TRANSITO,
  'AGUARDANDO TRANSITO': FaseDerivada.AGUARDANDO_TRANSITO,
  'AGUARDANDO ALVARÁ': FaseDerivada.AGUARDANDO_ALVARA,
  'AGUARDANDO ALVARA': FaseDerivada.AGUARDANDO_ALVARA,
  'EM RECURSO': FaseDerivada.EM_RECURSO,
};

export function toFaseCanonical(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null;
  const t = String(raw).trim();
  const direct = LEGACY_FASE_TO_CANONICAL[t];
  if (direct) return direct;
  if (/^[A-Z][A-Z0-9_]*$/.test(t)) return t;
  const upper = t
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
  return upper || null;
}

export function pendenciaFaseCanonical(tipo: string): string {
  const slug = tipo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 40);
  return slug ? `PENDENCIA_${slug}` : 'PENDENCIA';
}
