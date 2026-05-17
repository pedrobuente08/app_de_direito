import type { ClassificacaoSemaforo, PdfSemaforoCor } from './pdf-batch-classifier';

export type SugestaoMergeSemaforo = {
  id: string;
  nomeCanonico: string;
  score: number;
};

export type CadastroCanonicoSemaforo = {
  id: string;
  nomeCanonico: string;
  aliases: string[];
};

export type SemaforoEnrichContext = {
  mapaComarcas: Record<string, string>;
  reus: CadastroCanonicoSemaforo[];
  adversarios: CadastroCanonicoSemaforo[];
};

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Similaridade 0–1 (Levenshtein normalizado). */
export function similaridadeTexto(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) {
    return 0;
  }
  if (na === nb) {
    return 1;
  }
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    return shorter / longer;
  }

  const m = na.length;
  const n = nb.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0]![j] = j;
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = na[i - 1] === nb[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  const dist = dp[m]![n]!;
  return 1 - dist / Math.max(m, n);
}

const FUZZY_LIMIAR = 0.85;

/** Último segmento numérico do CNJ (origem / comarca). */
export function extrairCodigoComarcaNumero(numero: string | null | undefined): string | null {
  if (!numero?.trim()) {
    return null;
  }
  const parts = numero.trim().split('.');
  const last = parts[parts.length - 1]?.replace(/\D/g, '') ?? '';
  if (!last) {
    return null;
  }
  return last.padStart(4, '0');
}

function varaCasaComComarca(
  vara: string | null | undefined,
  numero: string | null | undefined,
  mapa: Record<string, string>,
): string | null {
  const keys = Object.keys(mapa).filter((k) => k.trim());
  if (!keys.length) {
    return null;
  }
  const codigo = extrairCodigoComarcaNumero(numero);
  if (!codigo) {
    return null;
  }
  const codNorm = codigo.replace(/^0+/, '') || '0';
  const codPadded = codigo.padStart(4, '0');
  const abrev =
    mapa[codPadded] ??
    mapa[codigo] ??
    mapa[codNorm] ??
    mapa[codNorm.padStart(4, '0')];
  if (!abrev?.trim()) {
    return `Comarca ${codPadded} não está no mapa de comarcas`;
  }
  const v = norm(vara ?? '');
  const esperado = norm(abrev);
  if (!v) {
    return `Vara vazia — comarca do número sugere “${abrev.trim()}”`;
  }
  if (!v.includes(esperado) && !esperado.split(/\s+/).every((p) => p.length < 3 || v.includes(p))) {
    return `Vara não confere com comarca do número (esperado: ${abrev.trim()})`;
  }
  return null;
}

function melhorFuzzy(
  texto: string | null | undefined,
  cadastros: CadastroCanonicoSemaforo[],
): SugestaoMergeSemaforo | null {
  const q = (texto ?? '').trim();
  if (q.length < 3 || !cadastros.length) {
    return null;
  }
  let best: SugestaoMergeSemaforo | null = null;
  for (const c of cadastros) {
    const candidatos = [c.nomeCanonico, ...c.aliases];
    for (const nome of candidatos) {
      const score = similaridadeTexto(q, nome);
      if (score >= FUZZY_LIMIAR && score < 1) {
        if (!best || score > best.score) {
          best = { id: c.id, nomeCanonico: c.nomeCanonico, score };
        }
      }
    }
  }
  return best;
}

function corAposAlertas(
  atual: PdfSemaforoCor,
  alertas: string[],
  duplicata: boolean,
  alertaEscaneado: boolean,
): PdfSemaforoCor {
  if (duplicata || alertaEscaneado) {
    return 'VERMELHO';
  }
  if (alertas.length > 0) {
    return atual === 'VERMELHO' ? 'VERMELHO' : 'AMARELO';
  }
  return atual === 'VERMELHO' ? 'VERMELHO' : 'VERDE';
}

export type EnriquecerSemaforoInput = {
  classificacao: ClassificacaoSemaforo;
  duplicata: boolean;
  alertaSkill?: string | null;
  numero: string | null;
  vara: string | null;
  reuTexto: string | null;
  arquivo: string;
  materia: string | null;
};

export type EnriquecerSemaforoResult = ClassificacaoSemaforo & {
  sugestaoMergeReu?: SugestaoMergeSemaforo;
  sugestaoMergeAdversario?: SugestaoMergeSemaforo;
};

/**
 * Regras adicionais do briefing §3.2 (comarcas, fuzzy réu/banca).
 * Não altera fluxo de confirmação — só cor e alertas do preview.
 */
export function enriquecerClassificacaoSemaforo(
  input: EnriquecerSemaforoInput,
  ctx: SemaforoEnrichContext,
): EnriquecerSemaforoResult {
  const alertas = [...input.classificacao.alertas];
  let sugestaoMergeReu: SugestaoMergeSemaforo | undefined;
  let sugestaoMergeAdversario: SugestaoMergeSemaforo | undefined;

  const comarcaAlerta = varaCasaComComarca(
    input.vara,
    input.numero,
    ctx.mapaComarcas,
  );
  if (comarcaAlerta) {
    alertas.push(comarcaAlerta);
  }

  if (!input.materia?.trim() && input.arquivo) {
    const base = input.arquivo.replace(/\.pdf$/i, '').trim();
    if (base.length > 0 && !/\d{7}-\d{2}/.test(base)) {
      alertas.push('Matéria não inferida do nome do arquivo');
    }
  }

  const sugReu = melhorFuzzy(input.reuTexto, ctx.reus);
  if (sugReu) {
    sugestaoMergeReu = sugReu;
    alertas.push(
      `Réu similar a “${sugReu.nomeCanonico}” (${Math.round(sugReu.score * 100)}%) — considere merge`,
    );
  }

  const sugAdv = melhorFuzzy(input.reuTexto, ctx.adversarios);
  if (sugAdv) {
    sugestaoMergeAdversario = sugAdv;
    alertas.push(
      `Banca adversária similar a “${sugAdv.nomeCanonico}” (${Math.round(sugAdv.score * 100)}%) — considere merge`,
    );
  }

  const cor = corAposAlertas(
    input.classificacao.cor,
    alertas,
    input.duplicata,
    input.alertaSkill === 'pdf_possivelmente_escaneado',
  );

  return {
    cor,
    alertas: [...new Set(alertas)],
    ...(sugestaoMergeReu ? { sugestaoMergeReu } : {}),
    ...(sugestaoMergeAdversario ? { sugestaoMergeAdversario } : {}),
  };
}
