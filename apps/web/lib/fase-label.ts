/** Chaves canônicas UPPER_SNAKE_CASE de `processo.fase_atual` → rótulo em português. */
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
}

export function faseLabel(chave: string | null | undefined): string {
  if (!chave?.trim()) return '—'
  const k = chave.trim()
  if (FASE_LABELS[k]) return FASE_LABELS[k]
  if (k.startsWith('PENDENCIA_') || k.startsWith('PENDÊNCIA')) {
    const rest = k.replace(/^PENDENCIA_?/i, '').replace(/^PENDÊNCIA\s*[-—]?\s*/i, '')
    return rest ? `Pendência — ${rest.replace(/_/g, ' ')}` : 'Pendência'
  }
  return k.replace(/_/g, ' ')
}

/** Opções padrão para dropdowns quando o escritório não define lista customizada. */
export const FASE_OPCOES_CANONICAS = Object.keys(FASE_LABELS)

export function faseSelectOptions(keys: string[]): { value: string; label: string }[] {
  const seen = new Set<string>()
  const out: { value: string; label: string }[] = []
  for (const raw of keys) {
    const v = raw.trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push({ value: v, label: faseLabel(v) })
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}
