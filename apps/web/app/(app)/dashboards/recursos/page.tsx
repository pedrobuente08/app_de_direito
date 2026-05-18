'use client'

import { useEffect, useState } from 'react'
import { DashCard } from '../_components/dash-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { getDashRecursos } from '@/lib/api'
import type { DashRecursos } from '@/lib/types'

export default function DashboardRecursosPage() {
  const [data, setData] = useState<DashRecursos | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashRecursos()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Acórdãos 2º grau" value={data?.totalAcordaos ?? 0} />
        <KpiCard label="Taxa provimento" value={`${data?.taxaProvimentoPct ?? 0}%`} variant="success" />
        <KpiCard label="Tempo médio (dias)" value={data?.tempoMedioDiasAcordao ?? 0} />
      </div>

      <DashCard title="Por turma">
        {data?.porTurma.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-[var(--color-text-secondary)]">
                <th className="pb-2 text-left">Turma</th>
                <th className="pb-2 text-right">Acórdãos</th>
              </tr>
            </thead>
            <tbody>
              {data.porTurma.map((t) => (
                <tr key={t.turma} className="border-t">
                  <td className="py-1">{t.turma}</td>
                  <td className="py-1 text-right font-mono">{t.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm">Nenhum acórdão de 2º grau registrado.</p>
        )}
      </DashCard>

      <DashCard title="Acórdãos recentes">
        {data?.recentes.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase">
                <th className="text-left">Data</th>
                <th className="text-left">Resultado</th>
                <th className="text-left">Favorável</th>
                <th className="text-left">Turma</th>
              </tr>
            </thead>
            <tbody>
              {data.recentes.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1 font-mono">{r.data}</td>
                  <td className="py-1">{r.resultado}</td>
                  <td className="py-1">{r.favoravelPara}</td>
                  <td className="py-1">{r.turma ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm">Sem registros.</p>
        )}
      </DashCard>
    </div>
  )
}
