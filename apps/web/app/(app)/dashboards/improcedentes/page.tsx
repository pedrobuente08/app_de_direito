'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashCard } from '../_components/dash-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { getDashImprocedentes } from '@/lib/api'
import type { DashImprocedentes } from '@/lib/types'

export default function DashboardImprocedentesPage() {
  const [data, setData] = useState<DashImprocedentes | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashImprocedentes()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Passivo a pagar"
          value={`R$ ${Number(data?.passivo.valorTotalAPagar ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
          variant="danger"
        />
        <KpiCard label="Linhas A_PAGAR" value={data?.passivo.linhasAPagar ?? 0} />
        <KpiCard label="AVALIAR ativos" value={data?.avaliar.ativos ?? 0} variant="warning" />
        <KpiCard label="AVALIAR vencidos" value={data?.avaliar.vencidos ?? 0} variant="danger" />
      </div>

      <DashCard title="Por status de pagamento">
        {data?.porStatusPagamento.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase">
                <th className="text-left">Status</th>
                <th className="text-right">Qtd</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.porStatusPagamento.map((s) => (
                <tr key={s.status} className="border-t">
                  <td className="py-1">{s.status}</td>
                  <td className="py-1 text-right font-mono">{s.total}</td>
                  <td className="py-1 text-right font-mono">
                    R$ {Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm">Sem improcedentes.</p>
        )}
      </DashCard>

      <DashCard title="AVALIAR — prazos">
        {data?.avaliar.lista.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase">
                <th className="text-left">Processo</th>
                <th className="text-left">Prazo</th>
                <th className="text-left">Situação</th>
              </tr>
            </thead>
            <tbody>
              {data.avaliar.lista.map((a) => (
                <tr key={a.processoId} className="border-t">
                  <td className="py-1 font-mono text-xs">{a.numero}</td>
                  <td className="py-1">{a.prazo ?? '—'}</td>
                  <td className="py-1">
                    {a.vencido ? (
                      <span className="text-[var(--urgencia-vencida-text)]">Vencido</span>
                    ) : (
                      <span className="text-[var(--color-text-secondary)]">No prazo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm">Nenhum processo em AVALIAR.</p>
        )}
        <p className="mt-3 text-xs">
          <Link href="/improcedentes" className="text-[var(--color-brand)] hover:underline">
            Ir para improcedentes →
          </Link>
        </p>
      </DashCard>
    </div>
  )
}
