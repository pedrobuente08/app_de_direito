'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashCard } from './_components/dash-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { getDashGeral, getDashPendenciasOrigem, getDashPassivoSucumbencia } from '@/lib/api'
import type { DashGeral, DashPendenciasOrigem, DashPassivoSucumbencia } from '@/lib/types'

export default function DashboardGeralPage() {
  const [geral, setGeral] = useState<DashGeral | null>(null)
  const [passivo, setPassivo] = useState<DashPassivoSucumbencia | null>(null)
  const [pendOrigem, setPendOrigem] = useState<DashPendenciasOrigem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashGeral(), getDashPassivoSucumbencia(), getDashPendenciasOrigem()])
      .then(([g, p, o]) => {
        setGeral(g)
        setPassivo(p)
        setPendOrigem(o)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Processos" value={geral?.totalProcessos ?? 0} />
        <KpiCard
          label="Comunicações órfãs"
          value={geral?.comunicacoesOrfas ?? 0}
          variant={geral?.comunicacoesOrfas ? 'warning' : 'default'}
        />
        <KpiCard
          label="Sem movimento (30d)"
          value={geral?.processosSemMovimento30d ?? 0}
          variant={geral?.processosSemMovimento30d ? 'danger' : 'default'}
        />
        <KpiCard
          label="Sucumbência a pagar"
          value={
            passivo
              ? `R$ ${Number(passivo.valorTotalAPagar).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
              : '—'
          }
          variant="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DashCard title="Funil por fase">
          {geral?.funilPorFase.length ? (
            <ul className="space-y-1.5 text-sm">
              {geral.funilPorFase.map((f) => (
                <li key={f.fase} className="flex justify-between gap-4">
                  <span className="truncate text-[var(--color-text-primary)]">{f.fase}</span>
                  <span className="shrink-0 font-mono font-semibold">{f.total}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">Sem dados.</p>
          )}
        </DashCard>

        <DashCard title="Funil por situação (qualidade)">
          {geral?.funilPorQualidade.length ? (
            <ul className="space-y-1.5 text-sm">
              {geral.funilPorQualidade.map((q) => (
                <li key={q.qualidade} className="flex justify-between gap-4">
                  <span className="truncate">{q.qualidade}</span>
                  <span className="shrink-0 font-mono font-semibold">{q.total}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">Sem dados.</p>
          )}
        </DashCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DashCard title="Pendências por origem">
          {pendOrigem ? (
            <div className="space-y-2">
              {pendOrigem.alertaManualAlto && (
                <p className="rounded border border-[var(--urgencia-atencao-border)] bg-[var(--urgencia-atencao-bg)] px-2 py-1 text-xs text-[var(--urgencia-atencao-text)]">
                  MANUAL: {pendOrigem.pctManual}% (&gt;70%)
                </p>
              )}
              <ul className="space-y-1 text-sm">
                {pendOrigem.porOrigem.map((o) => (
                  <li key={o.origem} className="flex justify-between">
                    <span>{o.origem}</span>
                    <span>
                      {o.total} ({o.pct}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm">Sem dados.</p>
          )}
        </DashCard>

        <DashCard title="Atalhos">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/comunicacoes" className="text-[var(--color-brand)] hover:underline">
                Comunicações órfãs →
              </Link>
            </li>
            <li>
              <Link href="/intimacoes" className="text-[var(--color-brand)] hover:underline">
                Intimações (processos) →
              </Link>
            </li>
            <li>
              <Link href="/dashboards/improcedentes" className="text-[var(--color-brand)] hover:underline">
                Dashboard improcedentes →
              </Link>
            </li>
          </ul>
        </DashCard>
      </div>
    </div>
  )
}
