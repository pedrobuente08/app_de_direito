import type { ConfirmarBatchItem, PdfPreviewItem, PdfSemaforoCor } from '@/lib/types'

/** Labels canónicos (PLANO_REVISAO_PDF_E_NOMES §1.3) para preview/revisão de PDF. */
export const PDF_PREVIEW_LABELS = {
  numero: 'Nº Processo',
  clienteNome: 'Cliente',
  clienteCpf: 'CPF',
  reuTexto: 'Réu',
  vara: 'Vara',
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
