/** Resultados que exigem valor monetário (briefing §2.2 / F1.1.1). */
const EXIGE_VALOR = new Set([
  'PROCEDENTE',
  'PARCIAL',
  'PARCIALMENTE_PROCEDENTE',
  'ACORDO',
  'PROCEDENTE_PARCIAL',
]);

export function resultadoSentencaExigeValor(resultado: string): boolean {
  const u = resultado.trim().toUpperCase();
  if (EXIGE_VALOR.has(u)) return true;
  if (u.includes('PARCIAL') && u.includes('PROCEDENTE')) return true;
  return false;
}

export function validarValorSentenca(
  resultado: string,
  valor: string | null | undefined,
): void {
  if (!resultadoSentencaExigeValor(resultado)) return;
  const v = (valor ?? '').trim();
  if (!v) {
    throw new Error(
      'Para este resultado, informe o valor da sentença (data, valor e favorável são obrigatórios).',
    );
  }
}
