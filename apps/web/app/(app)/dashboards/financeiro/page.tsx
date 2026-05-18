'use client'

import { useEffect, useState } from 'react'
import { DashCard } from '../_components/dash-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { getDashFinanceiro } from '@/lib/api'
import type { DashFinanceiro } from '@/lib/types'

export default function DashboardFinanceiroPage() {
  const [data, setData] = useState<DashFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashFinanceiro()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
  }

  return (
    <div className="space-y-5">
      <p className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
        {data?.mensagem}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="Total recebido"
          value={`R$ ${Number(data?.recebimentos.valorTotalRecebido ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          foot={`${data?.recebimentos.linhasComValor ?? 0} linha(s) com valor`}
          variant="success"
        />
        <KpiCard
          label="Carteira aguardando recebimento"
          value={`R$ ${Number(data?.carteiraAguardandoRecebimento ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
          variant="warning"
        />
      </div>

      <DashCard title="Fatores de provisão (config)">
        {data?.fatoresProvisaoPct.length ? (
          <div className="flex flex-wrap gap-2">
            {data.fatoresProvisaoPct.map((pct) => (
              <span
                key={pct}
                className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-1 text-sm font-semibold"
              >
                {pct}%
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm">Configure em Configurações → Geral.</p>
        )}
      </DashCard>

      <DashCard title="Provisão escalonada (M2)">
        <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
          Forecast trimestral completo será disponibilizado na fase M2. Os fatores acima serão aplicados
          sobre a carteira ativa.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-[var(--color-text-secondary)]">
              <th className="pb-2 text-left">Fator</th>
              <th className="pb-2 text-right">Valor estimado</th>
            </tr>
          </thead>
          <tbody>
            {data?.provisaoEscalonada.map((p) => (
              <tr key={p.fatorPct} className="border-t">
                <td className="py-1">{p.fatorPct}%</td>
                <td className="py-1 text-right text-[var(--color-text-secondary)]">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DashCard>
    </div>
  )
}
