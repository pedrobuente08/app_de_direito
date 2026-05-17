'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { DropdownsProcessoConfig, Processo } from '@/lib/types'
import { ProcessoDetailPanel } from './processo-detail-panel'
import type { ToastApi } from './processo-editable'

type Props = {
  processo: Processo
  onClose: () => void
  onUpdated: (p: Processo) => void
  toast: ToastApi
  readOnly?: boolean
  dropdowns?: DropdownsProcessoConfig | null
}

/** Drawer lateral de detalhe do processo (Sprint 1 — F0.1). */
export function ProcessoModal({
  processo,
  onClose,
  onUpdated,
  toast,
  readOnly,
  dropdowns,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (typeof document === 'undefined') return null

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
        aria-label={`Processo ${processo.numero}`}
        className="fixed inset-y-0 right-0 z-[51] flex w-full max-w-[min(56rem,100vw)] flex-col border-l border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        style={{ top: 'var(--header-height)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-mono text-sm font-semibold text-[var(--color-text-primary)]">
              {processo.numero}
            </h2>
            {processo.clienteNome ? (
              <p className="truncate text-xs text-[var(--color-text-secondary)]">
                {processo.clienteNome}
              </p>
            ) : null}
            {readOnly ? (
              <span className="text-xs text-[var(--color-text-secondary)]">Somente leitura</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
          <ProcessoDetailPanel
            processo={processo}
            onUpdated={onUpdated}
            toast={toast}
            readOnly={readOnly}
            dropdowns={dropdowns}
          />
        </div>
      </div>
    </>,
    document.body,
  )
}
