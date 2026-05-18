'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashCard } from '../_components/dash-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { getDashAudiencias } from '@/lib/api'
import type { DashAudiencias } from '@/lib/types'

export default function DashboardAudienciasPage() {
  const [data, setData] = useState<DashAudiencias | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashAudiencias()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
  }

  const heatmapByPautista = new Map<string, { data: string; total: number }[]>()
  for (const h of data?.heatmapPautista ?? []) {
    const list = heatmapByPautista.get(h.pautista) ?? []
    list.push({ data: h.data, total: h.total })
    heatmapByPautista.set(h.pautista, list)
  }
  const heatmapEntries = Array.from(heatmapByPautista.entries())

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Futuras" value={data?.audienciasFuturas ?? 0} />
        <KpiCard label="Cadastradas" value={data?.audienciasCadastradas ?? 0} />
        <KpiCard
          label="OBS pré pendentes (7d)"
          value={data?.obsPrePendentes ?? 0}
          variant={data?.obsPrePendentes ? 'warning' : 'default'}
        />
      </div>

      <DashCard title="Próximos 7 dias">
        {data?.proximos7d.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-[var(--color-text-secondary)]">
                  <th className="pb-2 text-left">Data</th>
                  <th className="pb-2 text-left">Hora</th>
                  <th className="pb-2 text-left">Processo</th>
                  <th className="pb-2 text-left">Cliente</th>
                  <th className="pb-2 text-left">Pautista</th>
                  <th className="pb-2 text-left">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {data.proximos7d.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 font-mono">{a.data}</td>
                    <td className="py-2">{a.hora ?? '—'}</td>
                    <td className="py-2">{a.processoNumero}</td>
                    <td className="py-2">{a.clienteNome ?? '—'}</td>
                    <td className="py-2">{a.pautista ?? '—'}</td>
                    <td className="py-2">{a.tipo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhuma audiência nos próximos 7 dias.</p>
        )}
        <p className="mt-3 text-xs">
          <Link href="/agenda" className="text-[var(--color-brand)] hover:underline">
            Abrir agenda →
          </Link>
        </p>
      </DashCard>

      <DashCard title="Heatmap pautista × dia">
        {heatmapEntries.length ? (
          <div className="space-y-4">
            {heatmapEntries.map(([pautista, dias]) => (
              <div key={pautista}>
                <p className="mb-1 text-xs font-semibold text-[var(--color-text-secondary)]">{pautista}</p>
                <div className="flex flex-wrap gap-2">
                  {dias.map((d) => (
                    <span
                      key={d.data}
                      className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1 text-xs"
                    >
                      {d.data}: <strong>{d.total}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm">Sem audiências no período.</p>
        )}
      </DashCard>
    </div>
  )
}
