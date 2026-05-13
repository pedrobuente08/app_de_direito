'use client'

import { useEffect, useState } from 'react'
import { apiUrl } from '@/lib/api'

type Row = Record<string, unknown>

export default function ImprocedentesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const res = await fetch(apiUrl('/improcedentes'), { credentials: 'include' })
        const j = await res.json().catch(() => [])
        if (!c && res.ok) setRows(Array.isArray(j) ? j : [])
        else if (!c) setError(typeof j?.message === 'string' ? j.message : 'Falha ao listar.')
      } catch (e) {
        if (!c) setError((e as Error).message)
      }
    })()
    return () => { c = true }
  }, [])

  return (
    <div className="animate-fade-in-up space-y-3">
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Improcedentes</h1>
      <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
        Gestão de sucumbência e estado AVALIAR (tabela <code className="rounded bg-[var(--color-bg-subtle)] px-1 font-mono text-xs">improcedente</code>). Lista carregada da API.
      </p>
      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm">{error}</div>
      )}
      {!error && rows.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)]">Nenhum registro de improcedente ainda.</p>
      )}
      {rows.length > 0 && (
        <pre className="overflow-auto rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3 text-xs">
          {JSON.stringify(rows, null, 2)}
        </pre>
      )}
    </div>
  )
}
