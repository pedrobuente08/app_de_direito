export type ComplementoParseado = {
  entrada: string;
  recursoTipo?: string;
  recursoOrigem?: string;
  recursoResultado?: string;
  docPendente?: string[];
  sentencaResultado?: string;
  confianca: number;
};

/**
 * Decomposição heurística do campo COMPLEMENTO (planilha histórica §3.3).
 */
export function parseComplemento(raw: string): ComplementoParseado {
  const entrada = raw.trim();
  const t = entrada.toUpperCase();
  if (!t) {
    return { entrada, confianca: 0 };
  }

  if (/PROCEDENTE\s+EM\s+PARTE|PARCIAL/i.test(t)) {
    return {
      entrada,
      sentencaResultado: 'PROCEDENTE_PARCIAL',
      confianca: 0.95,
    };
  }

  if (/PROCURA/.test(t) && /ALVAR/.test(t)) {
    return {
      entrada,
      docPendente: ['procuracao_alvara'],
      confianca: 0.9,
    };
  }

  if (/COMPROVANTE/.test(t) && /PAGAMENTO/.test(t)) {
    return {
      entrada,
      docPendente: ['comprovante_pagamento'],
      confianca: 0.9,
    };
  }

  const recursoMatch = t.match(
    /^(RI|ED|AG|RR|RE)\s+(?:DO\s+)?(REU|RÉU|NOSSO|NOS|AUTOR)?\s*(.*)$/i,
  );
  if (recursoMatch) {
    const tipo = recursoMatch[1]!.toUpperCase();
    let origem = recursoMatch[2]?.toUpperCase().replace('RÉU', 'REU');
    if (origem === 'NOS' || origem === 'AUTOR') origem = 'NOSSO';
    const resto = (recursoMatch[3] ?? '').trim();
    let resultado = resto || undefined;
    if (resultado?.includes('NAO ACOLHID') || resultado?.includes('NÃO ACOLHID')) {
      resultado = 'NAO_ACOLHIDO';
    } else if (resultado?.includes('MAJOROU')) {
      resultado = 'MAJOROU';
    } else if (resultado?.includes('MANTEVE')) {
      resultado = 'MANTEVE';
    }
    return {
      entrada,
      recursoTipo: tipo,
      recursoOrigem: origem,
      recursoResultado: resultado,
      confianca: origem && resultado ? 0.85 : 0.65,
    };
  }

  if (/\bRI\b/.test(t) && /\bMAJOROU\b/.test(t)) {
    return {
      entrada,
      recursoTipo: 'RI',
      recursoOrigem: 'NOSSO',
      recursoResultado: 'MAJOROU',
      confianca: 0.8,
    };
  }

  return { entrada, confianca: 0.3 };
}

export function parseComplementoLote(linhas: string[]): ComplementoParseado[] {
  return linhas.map((l) => parseComplemento(l));
}
