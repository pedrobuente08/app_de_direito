'use client'

import { useEffect, useState } from 'react'
import { getProcessoObservacoes } from '@/lib/api'
import type { ObservacaoItem } from '@/lib/types'

const FONTE_LABEL: Record<string, string> = {
  GERAL: 'Geral',
  'PRÉ-AUDIÊNCIA': 'Pré-audiência',
  'PÓS-AUDIÊNCIA': 'Pós-audiência',
  PENDÊNCIA: 'Pendência',
  SENTENÇA: 'Sentença',
  PROCEDENTE: 'Procedente',
}

type Props = {
  processoId: string
}

export function CentroObservacoes({ processoId }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ObservacaoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getProcessoObservacoes(processoId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, processoId])

  return (
    <div className="col-span-2 sm:col-span-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-[var(--color-brand)] hover:underline"
      >
        {open ? 'Ocultar centro de observações' : 'Centro de observações'}
      </button>
      {open ? (
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3">
          {loading ? (
            <p className="text-xs text-[var(--color-text-secondary)]">Carregando…</p>
          ) : error ? (
            <p className="text-xs text-[var(--urgencia-vencida-text)]">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Nenhuma observação registrada.
            </p>
          ) : (
            items.map((item, i) => (
              <div
                key={`${item.fonte}-${i}`}
                className="border-b border-[var(--color-border-default)] pb-2 last:border-0 last:pb-0"
              >
                <p className="text-[10px] font-semibold uppercase text-[var(--color-text-tertiary)]">
                  {FONTE_LABEL[item.fonte] ?? item.fonte}
                  {item.dataRef
                    ? ` · ${String(item.dataRef).slice(0, 10)}`
                    : ''}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-[var(--color-text-primary)]">
                  {item.texto}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
