'use client'

import { useEffect, useState } from 'react'
import { getAudiencias } from '@/lib/api'
import type { Audiencia } from '@/lib/types'
import { AgendaCard } from '@/components/agenda/agenda-card'

export default function AgendaPage() {
  const [rows, setRows] = useState<Audiencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getAudiencias()
        if (!c) setRows(data)
      } catch (e) {
        if (!c) setError((e as Error).message)
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => { c = true }
  }, [])

  return (
    <div className="animate-fade-in-up space-y-4">
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Agenda</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Vista em cartões das audiências ativas (mesma fonte que Audiências). Em evolução: toggle lista compacta.
      </p>
      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm">{error}</div>
      )}
      {!loading && !error && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.filter((a) => a.status === 'AGENDADA').map((a) => (
            <AgendaCard key={a.id} audiencia={a} />
          ))}
        </div>
      )}
    </div>
  )
}
