'use client'

import { useEffect, useState } from 'react'
import { DashCard } from '../_components/dash-card'
import {
  getDashCruzamento5d,
  getDashQualidadeProcedencia,
  getDashTeseReuVara,
  getDashTopBancas,
  getDashVaras,
} from '@/lib/api'
import type {
  DashCruzamento5d,
  DashQualidadeProcedencia,
  DashTeseReuVara,
  DashTopBancas,
  DashVara,
} from '@/lib/types'

export default function DashboardVarasPage() {
  const [varas, setVaras] = useState<DashVara[]>([])
  const [teseReuVara, setTeseReuVara] = useState<DashTeseReuVara[]>([])
  const [qualidade, setQualidade] = useState<DashQualidadeProcedencia[]>([])
  const [topBancas, setTopBancas] = useState<DashTopBancas | null>(null)
  const [cruzamento5d, setCruzamento5d] = useState<DashCruzamento5d[]>([])
  const [filterMateria, setFilterMateria] = useState('')
  const [filterReu, setFilterReu] = useState('')
  const [filterVara, setFilterVara] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingTese, setLoadingTese] = useState(true)

  useEffect(() => {
    Promise.all([
      getDashVaras(),
      getDashQualidadeProcedencia(),
      getDashTopBancas(),
      getDashCruzamento5d(),
    ])
      .then(([v, q, b, c]) => {
        setVaras(v)
        setQualidade(q)
        setTopBancas(b)
        setCruzamento5d(c)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setLoadingTese(true)
    getDashTeseReuVara({
      materia: filterMateria || undefined,
      reu: filterReu || undefined,
      vara: filterVara || undefined,
    })
      .then(setTeseReuVara)
      .finally(() => setLoadingTese(false))
  }, [filterMateria, filterReu, filterVara])

  const totalProcessos = varas.reduce((s, v) => s + v.total, 0)
  const top5 = varas.slice(0, 5)

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
  }

  return (
    <div className="space-y-5">
      <DashCard title="Top 5 varas">
        {top5.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-[var(--color-text-secondary)]">
                <th className="pb-2 text-left">Vara</th>
                <th className="pb-2 text-right">Processos</th>
                <th className="pb-2 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {top5.map((v) => (
                <tr key={String(v.vara)}>
                  <td className="py-2">{v.vara ?? '(sem vara)'}</td>
                  <td className="py-2 text-right font-mono">{v.total}</td>
                  <td className="py-2 text-right text-[var(--color-text-secondary)]">
                    {totalProcessos > 0 ? ((v.total / totalProcessos) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm">Sem dados.</p>
        )}
      </DashCard>

      <DashCard title="Procedência por situação">
        {qualidade.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-[var(--color-text-secondary)]">
                <th className="pb-2 text-left">Situação</th>
                <th className="pb-2 text-right">Total</th>
                <th className="pb-2 text-right">Proc.</th>
                <th className="pb-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {qualidade.map((q) => (
                <tr key={q.qualidadeCaso} className="border-t">
                  <td className="py-1">{q.qualidadeCaso}</td>
                  <td className="py-1 text-right font-mono">{q.total}</td>
                  <td className="py-1 text-right font-mono">{q.procedentes}</td>
                  <td className="py-1 text-right">{q.taxaProcedenciaPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm">Sem dados.</p>
        )}
      </DashCard>

      <DashCard title="Tese × Réu × Vara (heatmap)">
        <div className="mb-4 flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Matéria</label>
            <input
              value={filterMateria}
              onChange={(e) => setFilterMateria(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Réu</label>
            <input
              value={filterReu}
              onChange={(e) => setFilterReu(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Vara</label>
            <input
              value={filterVara}
              onChange={(e) => setFilterVara(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm"
            />
          </div>
        </div>
        {loadingTese ? (
          <p className="text-sm">Carregando…</p>
        ) : teseReuVara.length === 0 ? (
          <p className="text-sm">Nenhum resultado.</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase">
                  <th className="text-left">Matéria</th>
                  <th className="text-left">Réu</th>
                  <th className="text-left">Vara</th>
                  <th className="text-right">N</th>
                  <th className="text-right">Proc.</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {teseReuVara.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1 pr-2">{r.materia}</td>
                    <td className="py-1 pr-2">{r.reuTexto}</td>
                    <td className="py-1 pr-2">{r.vara}</td>
                    <td className="py-1 text-right font-mono">{r.total}</td>
                    <td className="py-1 text-right font-mono">{r.procedentes}</td>
                    <td className="py-1 text-right">
                      {r.total > 0 ? ((r.procedentes / r.total) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>

      <DashCard title="Top bancas adversárias">
        {topBancas?.bancas.length ? (
          <>
            <p className="mb-2 text-xs">
              Tempo médio até sentença: <strong>{topBancas.tempoMedioDiasAteSentenca}</strong> dias
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase">
                  <th className="text-left">Banca</th>
                  <th className="text-right">Aud.</th>
                  <th className="text-right">Acordo %</th>
                </tr>
              </thead>
              <tbody>
                {topBancas.bancas.map((b) => (
                  <tr key={b.bancaId} className="border-t">
                    <td className="py-1">{b.banca}</td>
                    <td className="py-1 text-right font-mono">{b.audiencias}</td>
                    <td className="py-1 text-right">{b.taxaAcordoPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-sm">Vincule bancas nas audiências.</p>
        )}
      </DashCard>

      <DashCard title="Cruzamento 5D">
        {cruzamento5d.length ? (
          <div className="max-h-72 overflow-auto text-xs">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Banca</th>
                  <th>Réu</th>
                  <th>Mat.</th>
                  <th>Vara</th>
                  <th>Res.</th>
                  <th>N</th>
                </tr>
              </thead>
              <tbody>
                {cruzamento5d.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-0.5">{r.banca}</td>
                    <td>{r.reuTexto ?? '—'}</td>
                    <td>{r.materia ?? '—'}</td>
                    <td>{r.vara ?? '—'}</td>
                    <td>{r.resultado}</td>
                    <td className="font-mono">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm">Sem dados.</p>
        )}
      </DashCard>
    </div>
  )
}
