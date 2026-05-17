'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getAudiencias, getAuthMe, getResumoAusentes6m } from '@/lib/api'
import type { Ausentes6mResumo } from '@/lib/types'
import type { Audiencia } from '@/lib/types'
import { AgendaCard } from '@/components/agenda/agenda-card'

function tituloDiaPt(isoYmd: string, total: number): string {
  const d = new Date(`${isoYmd}T12:00:00`)
  const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d).toUpperCase()
  const dataCurta = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
  return `${diaSemana}  ·  ${dataCurta}  ·  ${total} audiência${total === 1 ? '' : 's'}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

type Periodo = 'hoje' | 'semana' | '4semanas' | 'tudo'

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Esta semana' },
  { value: '4semanas', label: 'Próximas 4 semanas' },
  { value: 'tudo', label: 'Tudo' },
]

export default function AgendaPage() {
  const [rows, setRows] = useState<Audiencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readOnly, setReadOnly] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>('4semanas')
  const [ausentesResumo, setAusentesResumo] = useState<Ausentes6mResumo | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [aud, aus] = await Promise.all([
        getAudiencias(),
        getResumoAusentes6m().catch(() => null),
      ])
      setRows(aud)
      setAusentesResumo(aus)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getAuthMe()
      .then((me) => setReadOnly(me.perfil === 'leitura'))
      .catch(() => setReadOnly(false))
  }, [])

  const agendadasPorDia = useMemo(() => {
    const hoje = toYmd(new Date())

    let dataFim: string | null = null
    if (periodo === 'hoje') dataFim = hoje
    else if (periodo === 'semana') dataFim = toYmd(addDays(new Date(), 7))
    else if (periodo === '4semanas') dataFim = toYmd(addDays(new Date(), 28))

    const ag = rows
      .filter((a) => {
        if (a.status !== 'AGENDADA') return false
        const dia = a.data.slice(0, 10)
        if (dia < hoje) return false
        if (dataFim && dia > dataFim) return false
        return true
      })
      .sort((a, b) => {
        const da = a.data.slice(0, 10).localeCompare(b.data.slice(0, 10))
        if (da !== 0) return da
        return (a.hora ?? '').localeCompare(b.hora ?? '')
      })

    const map = new Map<string, Audiencia[]>()
    for (const a of ag) {
      const key = a.data.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    const dias = Array.from(map.keys()).sort()
    return { map, dias, total: ag.length }
  }, [rows, periodo])

  return (
    <div className="animate-fade-in-up space-y-5">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Agenda</h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
        >
          Atualizar
        </button>
      </div>

      {ausentesResumo && ausentesResumo.total > 0 && (
        <Link
          href="/ausentes"
          className="block rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 hover:bg-[var(--color-bg-hover)]"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Autores ausentes (6 meses)
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-primary)]">
            <strong>{ausentesResumo.pctReaproveitados}%</strong> reaproveitados ·{' '}
            {ausentesResumo.reaproveitados}/{ausentesResumo.total} ·{' '}
            {ausentesResumo.reaproveitaveis} marcados para reprotocolar
          </p>
        </Link>
      )}

      {/* Filtro de período */}
      <div className="flex flex-wrap gap-1.5">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriodo(p.value)}
            className={[
              'rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-medium transition-colors',
              periodo === p.value
                ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)] text-[var(--color-brand-text)]'
                : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
        {!loading && (
          <span className="ml-2 self-center text-xs text-[var(--color-text-secondary)]">
            {agendadasPorDia.total} audiência{agendadasPorDia.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Estados */}
      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error}{' '}
          <button type="button" onClick={load} className="underline">Tentar novamente</button>
        </div>
      )}

      {!loading && !error && agendadasPorDia.dias.length === 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-10 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhuma audiência agendada no período selecionado.
        </div>
      )}

      {/* Cards por dia */}
      {!loading && !error && agendadasPorDia.dias.map((dia) => {
        const lista = agendadasPorDia.map.get(dia) ?? []
        return (
          <section key={dia} className="space-y-3">
            <h2 className="border-b border-[var(--color-border-default)] pb-2 font-mono text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              {tituloDiaPt(dia, lista.length)}
            </h2>
            <div className="mx-auto flex max-w-xl flex-col gap-4">
              {lista.map((a) => (
                <AgendaCard key={a.id} audiencia={a} readOnly={readOnly} onUpdated={load} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
