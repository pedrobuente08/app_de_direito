'use client'

import { useState, useCallback, useMemo, useRef } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

type ToastItem = { id: number; message: string; type: ToastType }

const TOAST_MS = 4500

const styles: Record<ToastType, string> = {
  success:
    'border-[var(--urgencia-normal-border)] bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]',
  error:
    'border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]',
  warning:
    'border-[var(--urgencia-atencao-border)] bg-[var(--urgencia-atencao-bg)] text-[var(--urgencia-atencao-text)]',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback(
    (message: string, type: ToastItem['type']) => {
      const id = ++counter.current
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => dismiss(id), TOAST_MS)
    },
    [dismiss],
  )

  const success = useCallback((msg: string) => add(msg, 'success'), [add])
  const error = useCallback((msg: string) => add(msg, 'error'), [add])
  const info = useCallback((msg: string) => add(msg, 'info'), [add])
  const warning = useCallback((msg: string) => add(msg, 'warning'), [add])

  return useMemo(
    () => ({ toasts, success, error, info, warning, dismiss }),
    [toasts, success, error, info, warning, dismiss],
  )
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}) {
  if (!toasts.length) return null
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-toast-in flex min-w-64 items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium shadow-[var(--shadow-lg)] ${styles[t.type]}`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 opacity-70 hover:opacity-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
