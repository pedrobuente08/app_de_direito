'use client'

import { useEffect, useState } from 'react'
import { getDashAudiencias, getDashPendencias, getDashTeseReuVara, getDashVaras } from '@/lib/api'
import type { DashAudiencias, DashPendenciaStatus, DashTeseReuVara, DashVara } from '@/lib/types'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
      <div className="border-b border-[var(--color-border-default)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Skeleton() {
  return <div className="h-6 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
}

export default function DashboardsPage() {
  const [varas, setVaras] = useState<DashVara[]>([])
  const [pendencias, setPendencias] = useState<DashPendenciaStatus[]>([])
  const [audiencias, setAudiencias] = useState<DashAudiencias | null>(null)
  const [teseReuVara, setTeseReuVara] = useState<DashTeseReuVara[]>([])

  const [loadingVaras, setLoadingVaras] = useState(true)
  const [loadingPendencias, setLoadingPendencias] = useState(true)
  const [loadingAudiencias, setLoadingAudiencias] = useState(true)
  const [loadingTese, setLoadingTese] = useState(true)

  const [filterMateria, setFilterMateria] = useState('')
  const [filterReu, setFilterReu] = useState('')
  const [filterVara, setFilterVara] = useState('')

  useEffect(() => {
    getDashVaras().then(setVaras).finally(() => setLoadingVaras(false))
    getDashPendencias().then(setPendencias).finally(() => setLoadingPendencias(false))
    getDashAudiencias().then(setAudiencias).finally(() => setLoadingAudiencias(false))
  }, [])

  useEffect(() => {
    setLoadingTese(true)
    getDashTeseReuVara({
      materia: filterMateria || undefined,
      reu: filterReu || undefined,
      vara: filterVara || undefined,
    }).then(setTeseReuVara).finally(() => setLoadingTese(false))
  }, [filterMateria, filterReu, filterVara])

  const totalProcessos = varas.reduce((s, v) => s + v.total, 0)

  return (
    <div className="animate-fade-in-up space-y-5">
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Dashboards</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {/* Audiências resumo */}
        <Card title="Audiências">
          {loadingAudiencias ? (
            <div className="space-y-2"><Skeleton /><Skeleton /></div>
          ) : audiencias ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Futuras</span>
                <span className="text-xl font-bold text-[var(--color-brand)]">{audiencias.futuras}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Total cadastradas</span>
                <span className="text-xl font-bold text-[var(--color-text-primary)]">{audiencias.total}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">Sem dados.</p>
          )}
        </Card>

        {/* Pendências por status */}
        <Card title="Pendências por status">
          {loadingPendencias ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)}</div>
          ) : pendencias.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Sem dados.</p>
          ) : (
            <ul className="space-y-2">
              {pendencias.map(p => (
                <li key={p.status} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-secondary)]">{p.status}</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{p.total}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Processos totais */}
        <Card title="Processos por vara">
          {loadingVaras ? (
            <div className="space-y-2"><Skeleton /></div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Total de processos</span>
              <span className="text-xl font-bold text-[var(--color-text-primary)]">{totalProcessos}</span>
            </div>
          )}
        </Card>

      </div>

      {/* Top varas */}
      <Card title="Processos por vara">
        {loadingVaras ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)}</div>
        ) : varas.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Sem dados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Vara</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Processos</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {varas.map(v => (
                  <tr key={v.vara}>
                    <td className="py-2 text-[var(--color-text-primary)]">{v.vara}</td>
                    <td className="py-2 text-right font-mono text-[var(--color-text-primary)]">{v.total}</td>
                    <td className="py-2 text-right text-[var(--color-text-secondary)]">
                      {totalProcessos > 0 ? ((v.total / totalProcessos) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Tese × Réu × Vara */}
      <Card title="Tese × Réu × Vara">
        <div className="mb-4 flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Matéria</label>
            <input value={filterMateria} onChange={e => setFilterMateria(e.target.value)}
              placeholder="Filtrar por matéria…"
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Réu</label>
            <input value={filterReu} onChange={e => setFilterReu(e.target.value)}
              placeholder="Filtrar por réu…"
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Vara</label>
            <input value={filterVara} onChange={e => setFilterVara(e.target.value)}
              placeholder="Filtrar por vara…"
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
          </div>
        </div>

        {loadingTese ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)}</div>
        ) : teseReuVara.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum resultado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Matéria', 'Réu', 'Vara', 'Total', 'Procedentes', '%'].map(col => (
                    <th key={col} className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {teseReuVara.map((r, i) => (
                  <tr key={i} className="hover:bg-[var(--color-bg-hover)]">
                    <td className="py-2 pr-4 text-[var(--color-text-primary)]">{r.materia}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{r.reuTexto}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{r.vara}</td>
                    <td className="py-2 pr-4 font-mono text-[var(--color-text-primary)]">{r.total}</td>
                    <td className="py-2 pr-4 font-mono text-[var(--color-text-primary)]">{r.procedentes}</td>
                    <td className="py-2 text-[var(--color-text-secondary)]">
                      {r.total > 0 ? ((r.procedentes / r.total) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
