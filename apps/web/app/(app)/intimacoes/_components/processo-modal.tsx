'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { DropdownsProcessoConfig, Processo, VaraConfig } from '@/lib/types'
import { ProcessoDetailPanel } from './processo-detail-panel'
import type { ToastApi } from './processo-editable'

type Props = {
  processo: Processo
  onClose: () => void
  onUpdated: (p: Processo) => void
  toast: ToastApi
  readOnly?: boolean
  dropdowns?: DropdownsProcessoConfig | null
  varasConfig?: Record<string, VaraConfig> | null
  onNovaPendencia?: (p: Processo) => void
  materias?: string[]
  logins?: string[]
}

/** Modal centralizado de detalhe do processo (Sprint 1 — F0.1). */
export function ProcessoModal({
  processo,
  onClose,
  onUpdated,
  toast,
  readOnly,
  dropdowns,
  varasConfig,
  onNovaPendencia,
  materias,
  logins,
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
        className="fixed left-1/2 z-[51] flex min-h-0 w-[min(68rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        style={{
          top: 'calc(var(--header-height) + var(--app-main-padding))',
          bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
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
            varasConfig={varasConfig}
            onNovaPendencia={onNovaPendencia}
            materias={materias}
            logins={logins}
          />
        </div>
      </div>
    </>,
    document.body,
  )
}
