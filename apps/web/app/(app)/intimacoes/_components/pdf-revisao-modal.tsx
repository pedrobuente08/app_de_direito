'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ConfirmarBatchItem, PdfPreviewItem, PdfSemaforoCor } from '@/lib/types'
import {
  PDF_PREVIEW_LABELS,
  SISTEMAS_TRIBUNAL_SUGESTAO,
  corBadgeClass,
  corLegendaPt,
  corLuzClass,
  corMensagemTopoSimples,
  corModalBordaClass,
  corModalTopoFaixaClass,
  previewItemToConfirmBatchItem,
} from '@/lib/pdf-preview'

/** Opções vindas de Configurações (matérias) e cadastros Comarcas / Usuários (logins). */
export type PdfRevisaoCatalogo = {
  materias: string[]
  comarcas: string[]
  logins: string[]
}

type Props = {
  open: boolean
  item: PdfPreviewItem | null
  confirming: boolean
  catalogo: PdfRevisaoCatalogo
  onClose: () => void
  onConfirm: (payload: ConfirmarBatchItem) => Promise<void>
  onAbrirProcessoExistente?: (id: string) => void
}

function mergedSelectOptions(
  catalog: readonly string[],
  current: string | null | undefined,
): string[] {
  const v = (current ?? '').trim()
  const set = new Set<string>()
  for (const x of catalog) {
    const t = x.trim()
    if (t) set.add(t)
  }
  if (v) set.add(v)
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function SelectOuTexto({
  label,
  hint,
  catalog,
  value,
  onChange,
  optional,
  placeholderTexto,
}: {
  label: string
  hint?: string
  catalog: readonly string[]
  value: string | null | undefined
  onChange: (v: string | null) => void
  optional?: boolean
  placeholderTexto?: string
}) {
  const opts = useMemo(() => mergedSelectOptions(catalog, value), [catalog, value])
  const str = value ?? ''
  const useSelect = opts.length > 0

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {label}
        {optional ? null : ' *'}
      </span>
      {hint ? <span className="text-[10px] text-[var(--color-text-tertiary)]">{hint}</span> : null}
      {useSelect ? (
        <select
          value={str}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]"
        >
          {optional ? <option value="">—</option> : null}
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={str}
          onChange={(e) => onChange(e.target.value.trim() === '' ? null : e.target.value)}
          placeholder={placeholderTexto}
          className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
        />
      )}
    </div>
  )
}

function SemaphoroVisual({ cor, confidence }: { cor: PdfSemaforoCor; confidence: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100)
  const barFill =
    cor === 'VERDE' ? 'bg-emerald-500' : cor === 'AMARELO' ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div
      className={`rounded-[var(--radius-md)] border-2 p-4 ${corBadgeClass(cor)}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2" aria-hidden>
          <span title="Verde" className={`inline-block h-4 w-4 rounded-full ${corLuzClass(cor, 'VERDE')}`} />
          <span title="Amarelo" className={`inline-block h-4 w-4 rounded-full ${corLuzClass(cor, 'AMARELO')}`} />
          <span title="Vermelho" className={`inline-block h-4 w-4 rounded-full ${corLuzClass(cor, 'VERMELHO')}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide">{cor}</p>
          <p className="mt-1 text-xs opacity-90">{corLegendaPt(cor)}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide opacity-80">
          <span>Confiança da extração</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className={`h-full min-w-[2px] rounded-full transition-[width] ${barFill}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

export function PdfRevisaoModal({
  open,
  item,
  confirming,
  catalogo,
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

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const sistemasOpts = useMemo(() => {
    const s = (form?.sistema ?? '').trim().toUpperCase()
    const set = new Set<string>([...SISTEMAS_TRIBUNAL_SUGESTAO])
    if (s) set.add(s.length > 20 ? s.slice(0, 20) : s)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [form?.sistema])

  if (!open || !item || !form || typeof document === 'undefined') {
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

  const bordaModal = corModalBordaClass(item.cor)
  const faixaTopo = corModalTopoFaixaClass(item.cor)

  return createPortal(
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-revisao-titulo"
        aria-describedby="pdf-revisao-cor-msg"
        className={`fixed left-1/2 z-[51] flex min-h-0 w-[min(48rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)] ${bordaModal}`}
        style={{
          top: 'calc(var(--header-height) + var(--app-main-padding))',
          bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          id="pdf-revisao-cor-msg"
          className={`shrink-0 px-4 py-3 sm:px-6 ${faixaTopo}`}
          role="status"
        >
          <p className="text-sm font-medium leading-snug">{corMensagemTopoSimples(item.cor)}</p>
        </div>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border-default)] px-6 py-4">
          <div className="min-w-0">
            <h2 id="pdf-revisao-titulo" className="text-base font-semibold text-[var(--color-text-primary)]">
              Revisar antes de inserir
            </h2>
            <p className="mt-0.5 truncate font-mono text-xs text-[var(--color-text-tertiary)]" title={item.arquivo}>
              {item.arquivo}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${corBadgeClass(item.cor)}`}>
              {item.cor}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 basis-0 space-y-4 overflow-y-auto overscroll-y-contain px-6 py-5">
          <SemaphoroVisual cor={item.cor} confidence={item.confidence} />

          {item.duplicata && item.processoExistenteId ? (
            <div className="rounded-[var(--radius-sm)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-3 py-2 text-sm text-[var(--urgencia-vencida-text)]">
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
            <ul className="list-inside list-disc rounded-[var(--radius-sm)] bg-[var(--urgencia-atencao-bg)] px-3 py-2 text-xs text-[var(--urgencia-atencao-text)]">
              {item.alertas.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {PDF_PREVIEW_LABELS.numero} *
              </span>
              <input
                value={form.numero}
                onChange={(e) => setField('numero', e.target.value)}
                className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 font-mono text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {PDF_PREVIEW_LABELS.sistema} *
              </span>
              <select
                value={(form.sistema ?? '').trim().toUpperCase()}
                onChange={(e) => setField('sistema', e.target.value)}
                className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 font-mono text-sm uppercase outline-none focus:border-[var(--color-brand)]"
              >
                {sistemasOpts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {PDF_PREVIEW_LABELS.clienteNome}
              </span>
              <input
                value={form.clienteNome ?? ''}
                onChange={(e) => setField('clienteNome', e.target.value || null)}
                className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {PDF_PREVIEW_LABELS.clienteCpf}
              </span>
              <input
                value={form.clienteCpf ?? ''}
                onChange={(e) => setField('clienteCpf', e.target.value || null)}
                className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <SelectOuTexto
              label={PDF_PREVIEW_LABELS.login}
              hint="Logins cadastrados em Usuários (aliases)."
              catalog={catalogo.logins}
              value={form.login}
              onChange={(v) => setField('login', v)}
              optional
              placeholderTexto="Login ou alias"
            />

            <SelectOuTexto
              label={PDF_PREVIEW_LABELS.vara}
              hint="Comarcas cadastradas em Comarcas (nome)."
              catalog={catalogo.comarcas}
              value={form.vara}
              onChange={(v) => setField('vara', v)}
              optional
              placeholderTexto="Nome da comarca / vara"
            />

            <SelectOuTexto
              label={PDF_PREVIEW_LABELS.materia}
              hint="Lista em Configurações → matérias válidas."
              catalog={catalogo.materias}
              value={form.materia}
              onChange={(v) => setField('materia', v)}
              optional
              placeholderTexto="Matéria"
            />

            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {PDF_PREVIEW_LABELS.reuTexto}
              </span>
              <input
                value={form.reuTexto ?? ''}
                onChange={(e) => setField('reuTexto', e.target.value || null)}
                className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {PDF_PREVIEW_LABELS.dataDistribuicao}
              </span>
              <input
                type="date"
                value={form.dataDistribuicao ?? ''}
                onChange={(e) => setField('dataDistribuicao', e.target.value || null)}
                className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {PDF_PREVIEW_LABELS.dataAudiencia}
              </span>
              <input
                type="date"
                value={form.dataAudiencia ?? ''}
                onChange={(e) => setField('dataAudiencia', e.target.value || null)}
                className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {PDF_PREVIEW_LABELS.horaAudiencia}
              </span>
              <input
                type="time"
                value={form.horaAudiencia ?? ''}
                onChange={(e) => setField('horaAudiencia', e.target.value || null)}
                className="min-h-[36px] w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-4">
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
    </>,
    document.body,
  )
}
