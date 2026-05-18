'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashCard } from '../_components/dash-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { getDashPendencias } from '@/lib/api'
import type { DashPendencias } from '@/lib/types'

export default function DashboardPendenciasPage() {
  const [data, setData] = useState<DashPendencias | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashPendencias()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Abertas" value={data?.sla.abertas ?? 0} />
        <KpiCard label="Vencidas" value={data?.sla.vencidas ?? 0} variant="danger" />
        <KpiCard label="Com prazo" value={data?.sla.comPrazo ?? 0} />
        <KpiCard
          label="% vencidas (SLA)"
          value={`${data?.sla.pctVencidas ?? 0}%`}
          variant={(data?.sla.pctVencidas ?? 0) > 20 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DashCard title="Por responsável">
          {data?.porResponsavel.length ? (
            <ul className="space-y-1.5 text-sm">
              {data.porResponsavel.map((r) => (
                <li key={r.responsavel} className="flex justify-between">
                  <span>{r.responsavel}</span>
                  <span className="font-mono font-semibold">{r.total}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">Sem pendências abertas.</p>
          )}
        </DashCard>

        <DashCard title="Por tipo">
          {data?.porTipo.length ? (
            <ul className="max-h-64 space-y-1.5 overflow-auto text-sm">
              {data.porTipo.map((t) => (
                <li key={t.tipo} className="flex justify-between gap-2">
                  <span className="truncate">{t.tipo}</span>
                  <span className="shrink-0 font-mono font-semibold">{t.total}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">Sem dados.</p>
          )}
        </DashCard>
      </div>

      <DashCard title="Por status">
        {data?.porStatus.length ? (
          <ul className="flex flex-wrap gap-4 text-sm">
            {data.porStatus.map((s) => (
              <li key={s.status}>
                <span className="text-[var(--color-text-secondary)]">{s.status}: </span>
                <strong>{s.total}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Sem dados.</p>
        )}
        <p className="mt-3 text-xs">
          <Link href="/pendencias" className="text-[var(--color-brand)] hover:underline">
            Ir para pendências →
          </Link>
        </p>
      </DashCard>
    </div>
  )
}
