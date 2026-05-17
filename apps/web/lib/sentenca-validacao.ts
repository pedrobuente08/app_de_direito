const EXIGE_VALOR = new Set([
  'PROCEDENTE',
  'PARCIAL',
  'PARCIALMENTE_PROCEDENTE',
  'ACORDO',
  'PROCEDENTE_PARCIAL',
])

export function resultadoSentencaExigeValor(resultado: string): boolean {
  const u = resultado.trim().toUpperCase()
  if (EXIGE_VALOR.has(u)) return true
  if (u.includes('PARCIAL') && u.includes('PROCEDENTE')) return true
  return false
}

export function validarFormSentenca(input: {
  data: string
  resultado: string
  favoravelPara: string
  valor: string
}): string | null {
  if (!input.data.trim()) return 'Informe a data da sentença.'
  if (!input.resultado.trim()) return 'Informe o resultado.'
  const fav = input.favoravelPara.trim().toUpperCase()
  if (!fav || !['AUTOR', 'REU'].includes(fav)) {
    return 'Informe se a sentença foi favorável ao autor ou ao réu.'
  }
  if (resultadoSentencaExigeValor(input.resultado) && !input.valor.trim()) {
    return 'Para este resultado, o valor da sentença é obrigatório.'
  }
  return null
}
