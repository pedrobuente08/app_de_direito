export const COMPROVANTE_RESIDENCIA_TIPOS = [
  { value: 'CONTA_LUZ', label: 'Conta de luz' },
  { value: 'CONTA_AGUA', label: 'Conta de água' },
  { value: 'CONTA_GAS', label: 'Conta de gás' },
  { value: 'FATURA_CARTAO', label: 'Fatura de cartão de crédito' },
  { value: 'EXTRATO_BANCARIO', label: 'Extrato bancário' },
  { value: 'CONTRATO_ALUGUEL', label: 'Contrato de aluguel' },
  { value: 'IPTU', label: 'IPTU' },
  { value: 'CONTA_INTERNET_TELEFONE', label: 'Conta de internet/telefone' },
  { value: 'OUTRO', label: 'Outro' },
] as const

export type ComprovanteResidenciaTipo = (typeof COMPROVANTE_RESIDENCIA_TIPOS)[number]['value']

export function comprovanteLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return COMPROVANTE_RESIDENCIA_TIPOS.find((t) => t.value === value)?.label ?? value
}

/** Retorna os tipos disponíveis para uma vara, ou todos se a vara não restringir. */
export function comprovantesDisponiveis(
  comprovantesAceitos: string[] | null | undefined,
): { value: string; label: string }[] {
  if (!comprovantesAceitos?.length) return [...COMPROVANTE_RESIDENCIA_TIPOS]
  return COMPROVANTE_RESIDENCIA_TIPOS.filter((t) =>
    comprovantesAceitos.includes(t.value),
  )
}
