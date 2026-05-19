/**
 * Valores canônicos de resultado de sentença (V3).
 * Mesclados com Configurações → dropdowns_processo.sentenca (extras ou aliases do escritório).
 * PROCEDENTE / PROCEDENTE_PARCIAL / ACORDO disparam o funil em procedentes (backend).
 * A_CLASSIFICAR é criado pelo Comunica ao receber sentença provisional.
 */
export const SENTENCA_OPCOES_PADRAO = [
  'PROCEDENTE',
  'PROCEDENTE_PARCIAL',
  'ACORDO',
  'IMPROCEDENTE',
  'EXTINTO_SEM_MERITO',
  'A_CLASSIFICAR',
] as const

export type SentencaResultado = (typeof SENTENCA_OPCOES_PADRAO)[number]

export function mergeSentencaOpcoes(extra?: string[] | null): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of SENTENCA_OPCOES_PADRAO as readonly string[]) {
    const s = raw.trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  for (const raw of extra ?? []) {
    const s = String(raw).trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}
