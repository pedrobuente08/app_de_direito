'use client'

import { useEffect, useState } from 'react'
import type { ConfirmarBatchItem, PdfPreviewItem, PdfSemaforoCor } from '@/lib/types'
import { PDF_PREVIEW_LABELS, corBadgeClass, previewItemToConfirmBatchItem } from '@/lib/pdf-preview'

type Props = {
  open: boolean
  item: PdfPreviewItem | null
  confirming: boolean
  onClose: () => void
  onConfirm: (payload: ConfirmarBatchItem) => Promise<void>
  onAbrirProcessoExistente?: (id: string) => void
}

export function PdfRevisaoModal({
  open,
  item,
  confirming,
  onClose,
  onConfirm,
  onAbrirProcessoExistente,
}: Props) {
  const [form, setForm] = useState<ConfirmarBatchItem | null>(null)

  useEffect(() => {
    if (open && item) {
      setForm(previewItemToConfirmBatchItem(item))
    } else if (!open) {
      setForm(null)
    }
  }, [open, item])

  if (!open || !item || !form) {
    return null
  }

  function setField<K extends keyof ConfirmarBatchItem>(k: K, v: ConfirmarBatchItem[K]) {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev))
  }

  const podeConfirmar =
    form.numero.trim().length > 0 && (form.sistema ?? '').trim().length > 0

  async function handleConfirm() {
    if (!podeConfirmar || !form) return
    await onConfirm(form)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-revisao-titulo"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 shadow-lg">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="pdf-revisao-titulo" className="text-base font-semibold text-[var(--color-text-primary)]">
              Revisar antes de inserir
            </h2>
            <p className="mt-0.5 truncate font-mono text-xs text-[var(--color-text-tertiary)]" title={item.arquivo}>
              {item.arquivo}
            </p>
          </div>
          <CorBadge cor={item.cor} />
        </div>

        {item.duplicata && item.processoExistenteId ? (
          <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-3 py-2 text-sm text-[var(--urgencia-vencida-text)]">
            <p className="font-medium">Duplicata</p>
            <p className="mt-1 text-xs">
              Já existe um processo com este número. Ajuste o número no formulário ou abra o cadastro existente.
            </p>
            {onAbrirProcessoExistente ? (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-[var(--color-brand)] hover:underline"
                onClick={() => {
                  onAbrirProcessoExistente(item.processoExistenteId!)
                  onClose()
                }}
              >
                Abrir processo existente →
              </button>
            ) : null}
          </div>
        ) : null}

        {item.alertas.length > 0 && (
          <ul className="mb-4 list-inside list-disc rounded-[var(--radius-sm)] bg-[var(--urgencia-atencao-bg)] px-3 py-2 text-xs text-[var(--urgencia-atencao-text)]">
            {item.alertas.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            {PDF_PREVIEW_LABELS.numero} *
            <input
              value={form.numero}
              onChange={(e) => setField('numero', e.target.value)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 font-mono text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            {PDF_PREVIEW_LABELS.sistema} *
            <input
              value={form.sistema}
              onChange={(e) => setField('sistema', e.target.value)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 font-mono text-sm uppercase"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)] sm:col-span-2">
            {PDF_PREVIEW_LABELS.clienteNome}
            <input
              value={form.clienteNome ?? ''}
              onChange={(e) => setField('clienteNome', e.target.value || null)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            {PDF_PREVIEW_LABELS.clienteCpf}
            <input
              value={form.clienteCpf ?? ''}
              onChange={(e) => setField('clienteCpf', e.target.value || null)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            {PDF_PREVIEW_LABELS.login}
            <input
              value={form.login ?? ''}
              onChange={(e) => setField('login', e.target.value || null)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)] sm:col-span-2">
            {PDF_PREVIEW_LABELS.reuTexto}
            <input
              value={form.reuTexto ?? ''}
              onChange={(e) => setField('reuTexto', e.target.value || null)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            {PDF_PREVIEW_LABELS.vara}
            <input
              value={form.vara ?? ''}
              onChange={(e) => setField('vara', e.target.value || null)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            {PDF_PREVIEW_LABELS.materia}
            <input
              value={form.materia ?? ''}
              onChange={(e) => setField('materia', e.target.value || null)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            {PDF_PREVIEW_LABELS.dataDistribuicao}
            <input
              type="date"
              value={form.dataDistribuicao ?? ''}
              onChange={(e) => setField('dataDistribuicao', e.target.value || null)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            {PDF_PREVIEW_LABELS.dataAudiencia}
            <input
              type="date"
              value={form.dataAudiencia ?? ''}
              onChange={(e) => setField('dataAudiencia', e.target.value || null)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            {PDF_PREVIEW_LABELS.horaAudiencia}
            <input
              type="time"
              value={form.horaAudiencia ?? ''}
              onChange={(e) => setField('horaAudiencia', e.target.value || null)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-[var(--color-text-tertiary)]">
          Confiança da extração: {Math.round((item.confidence || 0) * 100)}%
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!podeConfirmar || confirming}
            className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {confirming ? 'Inserindo…' : 'Confirmar inserção'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CorBadge({ cor }: { cor: PdfSemaforoCor }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${corBadgeClass(cor)}`}
    >
      {cor}
    </span>
  )
}
