import type { ConfirmarBatchItem, PdfPreviewItem, PdfSemaforoCor } from '@/lib/types'

/** Labels canónicos (PLANO_REVISAO_PDF_E_NOMES §1.3) para preview/revisão de PDF. */
export const PDF_PREVIEW_LABELS = {
  numero: 'Número',
  clienteNome: 'Cliente',
  clienteCpf: 'CPF',
  reuTexto: 'Réu',
  vara: 'Comarca',
  materia: 'Matéria',
  sistema: 'Sistema',
  login: 'Login',
  dataDistribuicao: 'Data de distribuição',
  dataAudiencia: 'Data da audiência',
  horaAudiencia: 'Hora da audiência',
} as const

export function corBadgeClass(cor: PdfSemaforoCor): string {
  if (cor === 'VERDE') {
    return 'border-[var(--urgencia-normal-border)] bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]'
  }
  if (cor === 'AMARELO') {
    return 'border-[var(--urgencia-atencao-border)] bg-[var(--urgencia-atencao-bg)] text-[var(--urgencia-atencao-text)]'
  }
  return 'border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]'
}

/** Sugestões de sistema (tribunal); o valor extraído é sempre acrescentado se não estiver na lista. */
export const SISTEMAS_TRIBUNAL_SUGESTAO: readonly string[] = [
  'TJRS',
  'TJSC',
  'TJSP',
  'TJMG',
  'TJMS',
  'TJPR',
  'TJBA',
  'TJRJ',
  'TRT4',
  'TRT12',
  'TRF4',
  'PJE',
  'ESAJ',
  'DESCONHECIDO',
] as const

export function corLegendaPt(cor: PdfSemaforoCor): string {
  if (cor === 'VERDE') return 'Semáforo verde — dados coerentes, pode confirmar com segurança.'
  if (cor === 'AMARELO') return 'Semáforo amarelo — revise os campos destacados antes de confirmar.'
  return 'Semáforo vermelho — bloqueante ou confiança nula; corrija ou descarte.'
}

/** Luz do semáforo (ativo = destaque). */
export function corLuzClass(cor: PdfSemaforoCor, luz: PdfSemaforoCor): string {
  const ativo = cor === luz
  if (luz === 'VERDE') {
    return ativo
      ? 'bg-emerald-500 ring-2 ring-emerald-700 ring-offset-2 ring-offset-[var(--color-bg-surface)]'
      : 'bg-emerald-200/70'
  }
  if (luz === 'AMARELO') {
    return ativo
      ? 'bg-amber-400 ring-2 ring-amber-600 ring-offset-2 ring-offset-[var(--color-bg-surface)]'
      : 'bg-amber-100'
  }
  return ativo
    ? 'bg-red-500 ring-2 ring-red-800 ring-offset-2 ring-offset-[var(--color-bg-surface)]'
    : 'bg-red-200/80'
}

/** Borda completa ao redor do modal de revisão PDF (semáforo). */
export function corModalBordaClass(cor: PdfSemaforoCor): string {
  if (cor === 'VERDE') return 'border-2 border-emerald-600'
  if (cor === 'AMARELO') return 'border-2 border-amber-500'
  return 'border-2 border-red-600'
}

/** Faixa informativa no topo do modal (mesma família cromática do semáforo). */
export function corModalTopoFaixaClass(cor: PdfSemaforoCor): string {
  if (cor === 'VERDE') {
    return 'border-b border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-50'
  }
  if (cor === 'AMARELO') {
    return 'border-b border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-50'
  }
  return 'border-b border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/50 dark:text-red-50'
}

/** Mensagem curta no topo explicando o significado da cor do semáforo. */
export function corMensagemTopoSimples(cor: PdfSemaforoCor): string {
  if (cor === 'VERDE') {
    return 'Verde: extração confiável — confira os dados e pode confirmar a inserção.'
  }
  if (cor === 'AMARELO') {
    return 'Amarelo: há avisos ou confiança baixa — revise os campos e os alertas antes de confirmar.'
  }
  return 'Vermelho: situação crítica (duplicata, PDF ilegível ou confiança nula) — corrija ou descarte.'
}

/** Monta o payload de `confirmar-batch` a partir de um item de preview (campos já editados). */
export function previewItemToConfirmBatchItem(r: PdfPreviewItem): ConfirmarBatchItem {
  const sistema = (r.sistema ?? 'DESCONHECIDO').trim() || 'DESCONHECIDO'
  return {
    itemId: r.itemId,
    numero: (r.numero ?? '').trim(),
    clienteNome: r.clienteNome,
    clienteCpf: r.clienteCpf,
    reuTexto: r.reuTexto,
    vara: r.vara,
    materia: r.materia,
    sistema,
    login: r.login,
    dataDistribuicao: r.dataDistribuicao,
    dataAudiencia: r.dataAudiencia,
    horaAudiencia: r.horaAudiencia,
  }
}
