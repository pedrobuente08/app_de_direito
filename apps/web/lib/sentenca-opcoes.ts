/**
 * Valores usuais de sentença (cartório / planilha).
 * Mesclados com Configurações → dropdowns_processo.sentenca (extras ou aliases).
 * PROCEDENTE / PARCIAL / ACORDO disparam o funil em procedentes (backend).
 */
export const SENTENCA_OPCOES_PADRAO = [
  'PROCEDENTE',
  'IMPROCEDENTE',
  'PARCIAL',
  'PARCIALMENTE_PROCEDENTE',
  'ACORDO',
  'EXTINTO_SEM_RESOLUCAO_DE_MERITO',
  'HOMOLOGADA_DESISTENCIA',
  'ANULADA',
  'SUSPENSO',
] as const

export function mergeSentencaOpcoes(extra?: string[] | null): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const padrao = SENTENCA_OPCOES_PADRAO as readonly string[]
  for (const raw of padrao) {
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
