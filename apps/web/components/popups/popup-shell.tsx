'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Btn } from '@/components/ui/btn'

type Props = {
  open: boolean
  title: string
  subtitle?: string | null
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Largura máxima do painel (classes Tailwind). */
  widthClass?: string
}

export function PopupShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  widthClass = 'w-[min(28rem,calc(100vw-2rem))]',
}: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
        className={`fixed left-1/2 top-1/2 z-[61] flex max-h-[min(90vh,40rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)] ${widthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-3">
          <h2
            id="popup-title"
            className="text-sm font-semibold text-[var(--color-text-primary)]"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
          {children}
        </div>
        {footer ? (
          <footer className="flex shrink-0 gap-2 border-t border-[var(--color-border-default)] px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </>,
    document.body,
  )
}

export function PopupFooterActions({
  onCancel,
  onConfirm,
  formId,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  confirmDisabled = false,
}: {
  onCancel: () => void
  onConfirm?: () => void
  formId?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  confirmDisabled?: boolean
}) {
  return (
    <>
      <Btn
        type="submit"
        form={formId}
        variant="primary"
        loading={loading}
        disabled={confirmDisabled}
        onClick={onConfirm}
        className="flex-1 sm:flex-none"
      >
        {confirmLabel}
      </Btn>
      <Btn type="button" variant="default" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Btn>
    </>
  )
}
