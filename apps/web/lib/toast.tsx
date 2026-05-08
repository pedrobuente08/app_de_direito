'use client'

import { useState, useCallback, useRef } from 'react'

type ToastItem = { id: number; message: string; type: 'success' | 'error' }

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
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const success = useCallback((msg: string) => add(msg, 'success'), [add])
  const error = useCallback((msg: string) => add(msg, 'error'), [add])

  return { toasts, success, error, dismiss }
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: { id: number; message: string; type: 'success' | 'error' }[]
  onDismiss: (id: number) => void
}) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex min-w-64 items-start gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium shadow-lg ${
            t.type === 'success'
              ? 'bg-[var(--color-brand)] text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
