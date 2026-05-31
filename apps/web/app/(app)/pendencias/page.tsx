'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { NovaPendenciaManualDialog } from '@/components/pendencias/nova-pendencia-manual-dialog'
import { CapturaSaudeWidget } from '@/components/captura/captura-saude-widget'
import { PopUpPosPendencia } from '@/components/popups'
import { FilterBar, FilterField, filterControlClass } from '@/components/ui/filter-bar'
import { FamiliaTabs } from '@/components/ui/familia-tabs'
import { KpiCard } from '@/components/ui/kpi-card'
import { getPendencias, getPendenciasResumo } from '@/lib/api'
import { labelOrigemPendencia, urgenciaPendencia } from '@/lib/pendencia-urgencia'
import type { Pendencia, PendenciasResumo } from '@/lib/types'
import { ToastContainer, useToast } from '@/lib/toast'

type FiltroUrgencia = '' | 'vencidos' | 'urgente' | 'atencao' | 'normal' | 'semPrazo'

const ORIGENS = [
  { id: '', label: 'Todas origens' },
  { id: 'MANUAL_INTIMACOES', label: 'Intimações' },
  { id: 'POS_AUDIENCIA', label: 'Pós-audiência' },
  { id: 'COMUNICA', label: 'Comunica' },
  { id: 'MANUAL', label: 'Manual' },
]

const URGENCIA_TABS = [
  { id: '', label: 'Todos' },
  { id: 'vencidos', label: 'Vencidos' },
  { id: 'urgente', label: 'Urgente ≤3d' },
  { id: 'atencao', label: 'Atenção 4–7d' },
  { id: 'normal', label: 'Normal >7d' },
  { id: 'semPrazo', label: 'Sem prazo' },
]

export default function PendenciasPage() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNova, setShowNova] = useState(false)
  const [pendenciaEncerrar, setPendenciaEncerrar] = useState<Pendencia | null>(null)
  const [resumo, setResumo] = useState<PendenciasResumo | null>(null)
  const [filtroOrigem, setFiltroOrigem] = useState('')
  const [filtroUrgencia, setFiltroUrgencia] = useState<FiltroUrgencia>('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [filtroFila, setFiltroFila] = useState('')
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, r] = await Promise.all([
        getPendencias({
          status: 'ABERTA',
          ...(filtroOrigem ? { origem: filtroOrigem } : {}),
        }),
        getPendenciasResumo(),
      ])
      setPendencias(list)
      setResumo(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [filtroOrigem])

  useEffect(() => {
    void load()
  }, [load])

  const listaFiltrada = useMemo(() => {
    return pendencias.filter((p) => {
      if (filtroUrgencia) {
        const bucket = urgenciaPendencia(p.dataLimite).bucket
        if (bucket !== filtroUrgencia) return false
      }
      if (filtroResponsavel.trim()) {
        const r = (p.responsavel ?? '').toLowerCase()
        if (!r.includes(filtroResponsavel.trim().toLowerCase())) return false
      }
      if (filtroFila.trim()) {
        const f = (p.fila ?? '').toLowerCase()
        if (!f.includes(filtroFila.trim().toLowerCase())) return false
      }
      return true
    })
  }, [pendencias, filtroUrgencia, filtroResponsavel, filtroFila])

  return (
    <div className="animate-fade-in-up space-y-4">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Pendências</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Tarefas abertas por processo — cumpra pela ação na linha.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNova(true)}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Nova pendência
        </button>
      </div>

      <CapturaSaudeWidget />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Total', value: resumo?.total, urg: '' as FiltroUrgencia, variant: 'default' as const },
          { label: 'Vencidos', value: resumo?.vencidos, urg: 'vencidos' as const, variant: 'danger' as const },
          { label: 'Urgente ≤3d', value: resumo?.urgente, urg: 'urgente' as const, variant: 'danger' as const },
          { label: 'Atenção 4–7d', value: resumo?.atencao, urg: 'atencao' as const, variant: 'warning' as const },
          { label: 'Normal >7d', value: resumo?.normal, urg: 'normal' as const, variant: 'success' as const },
          { label: 'Sem prazo', value: resumo?.semPrazo, urg: 'semPrazo' as const, variant: 'accent' as const },
          {
            label: 'Cumpridos 30d',
            value: resumo?.cumpridos30d,
            urg: '' as FiltroUrgencia,
            variant: 'default' as const,
          },
        ].map((c) => (
          <KpiCard
            key={c.label}
            label={c.label}
            value={c.value ?? '—'}
            variant={c.variant}
            onClick={
              c.label === 'Cumpridos 30d'
                ? undefined
                : () => setFiltroUrgencia((prev) => (prev === c.urg ? '' : c.urg))
            }
          />
        ))}
      </div>

      <FamiliaTabs
        tabs={URGENCIA_TABS.map((t) => ({
          ...t,
          count:
            t.id === ''
              ? pendencias.length
              : pendencias.filter((p) => urgenciaPendencia(p.dataLimite).bucket === t.id).length,
        }))}
        activeId={filtroUrgencia}
        onChange={(id) => setFiltroUrgencia(id as FiltroUrgencia)}
      />

      <FilterBar>
        <FilterField label="Responsável" className="min-w-[140px]">
          <input
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            placeholder="Contém…"
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Fila" className="min-w-[120px]">
          <input
            value={filtroFila}
            onChange={(e) => setFiltroFila(e.target.value)}
            placeholder="Ex.: ATENDIMENTO"
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Origem" className="min-w-[160px]">
          <select
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value)}
            className={filterControlClass}
          >
            {ORIGENS.map((o) => (
              <option key={o.id || 'todas'} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhuma pendência aberta com estes filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {[
                  'Nº processo',
                  'Tipo',
                  'Origem',
                  'Prazo',
                  'Dias',
                  'Responsável / Fila',
                  'Status',
                  '',
                ].map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {listaFiltrada.map((p) => {
                const urg = urgenciaPendencia(p.dataLimite)
                return (
                  <tr key={p.id} className="hover:bg-[var(--color-bg-hover)]">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-[var(--color-text-primary)]">
                        {p.processo?.numero ?? p.processoId.slice(0, 8) + '…'}
                      </span>
                      {p.processo?.clienteNome ? (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {p.processo.clienteNome}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{p.tipo}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
                      {labelOrigemPendencia(p.origem)}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {p.dataLimite
                        ? p.dataLimite.slice(5).replace('-', '/')
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: urg.bg,
                          color: urg.text,
                          border: `1px solid ${urg.border}`,
                        }}
                      >
                        {urg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <p>{p.responsavel ?? '—'}</p>
                      {p.fila ? (
                        <p className="text-[var(--color-text-tertiary)]">Fila: {p.fila}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-[var(--urgencia-normal-bg)] px-2 py-0.5 text-xs text-[var(--urgencia-normal-text)]">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setPendenciaEncerrar(p)}
                        className="text-xs font-medium text-[var(--color-brand)] hover:underline"
                      >
                        Cumprir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <NovaPendenciaManualDialog
        open={showNova}
        onClose={() => setShowNova(false)}
        onSuccess={() => {
          toast.success('Pendência criada.')
          void load()
        }}
      />

      <PopUpPosPendencia
        open={!!pendenciaEncerrar}
        pendencia={pendenciaEncerrar}
        onClose={() => setPendenciaEncerrar(null)}
        onSuccess={() => {
          toast.success('Pendência encerrada.')
          void load()
        }}
      />
    </div>
  )
}
