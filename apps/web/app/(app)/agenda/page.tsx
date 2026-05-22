'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AgendaCard } from '@/components/agenda/agenda-card'
import { Btn } from '@/components/ui/btn'
import { FamiliaTabs } from '@/components/ui/familia-tabs'
import { KpiCard } from '@/components/ui/kpi-card'
import { getAudiencias, getAuthMe, getResumoAusentes6m } from '@/lib/api'
import { audienciaAtribuidaAoUsuario } from '@/lib/pautista-match'
import type { Audiencia, Ausentes6mResumo, AuthMe } from '@/lib/types'

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
type VisaoAgenda = 'todas' | 'minhas'

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
  const [canEditPautista, setCanEditPautista] = useState(false)
  const [me, setMe] = useState<AuthMe | null>(null)
  const [visao, setVisao] = useState<VisaoAgenda>('todas')
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

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    getAuthMe()
      .then((auth) => {
        setMe(auth)
        setReadOnly(auth.perfil === 'leitura')
        setCanEditPautista(
          auth.perfil === 'admin' ||
            auth.perfil === 'adm' ||
            auth.perfil === 'advogado',
        )
        setVisao(auth.perfil === 'pautista' ? 'minhas' : 'todas')
      })
      .catch(() => {
        setReadOnly(false)
        setCanEditPautista(false)
      })
  }, [])

  const somentePautista = me?.perfil === 'pautista'
  const podeVerTodas = !somentePautista
  const podeVerMinhas = Boolean(me?.ehPautista)

  const visaoTabs = useMemo(() => {
    const tabs: { id: VisaoAgenda; label: string }[] = []
    if (podeVerTodas) tabs.push({ id: 'todas', label: 'Todas' })
    if (podeVerMinhas) tabs.push({ id: 'minhas', label: 'Minhas (como pautista)' })
    return tabs
  }, [podeVerTodas, podeVerMinhas])

  const rowsFiltradas = useMemo(() => {
    if (visao !== 'minhas' || !me) return rows
    return rows.filter((a) =>
      audienciaAtribuidaAoUsuario(a.pautista, me.nome, me.email),
    )
  }, [rows, visao, me])

  const agendadasPorDia = useMemo(() => {
    const hoje = toYmd(new Date())

    let dataFim: string | null = null
    if (periodo === 'hoje') dataFim = hoje
    else if (periodo === 'semana') dataFim = toYmd(addDays(new Date(), 7))
    else if (periodo === '4semanas') dataFim = toYmd(addDays(new Date(), 28))

    const ag = rowsFiltradas
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
  }, [rowsFiltradas, periodo])

  const hojeCount = useMemo(() => {
    const hoje = toYmd(new Date())
    return rowsFiltradas.filter(
      (a) => a.status === 'AGENDADA' && a.data.slice(0, 10) === hoje,
    ).length
  }, [rowsFiltradas])

  const subtitulo =
    somentePautista
      ? 'Suas audiências atribuídas — registre o resultado após a audiência.'
      : visao === 'minhas'
        ? 'Audiências em que você está como pautista — finalize com o pop-up pós-audiência.'
        : 'Todas as audiências — atribua o pautista e finalize com o pop-up pós-audiência.'

  return (
    <div className="animate-fade-in-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Agenda</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitulo}</p>
        </div>
        <Btn variant="default" loading={loading} onClick={() => void load()}>
          Atualizar
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Hoje" value={hojeCount} variant="accent" />
        <KpiCard label="No período" value={agendadasPorDia.total} variant="default" />
        <KpiCard
          label="Dias com audiência"
          value={agendadasPorDia.dias.length}
          variant="default"
        />
      </div>

      {!somentePautista && ausentesResumo && ausentesResumo.total > 0 && (
        <Link
          href="/ausentes"
          className="block rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Autores ausentes (6 meses)
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-primary)]">
            <strong>{ausentesResumo.pctReaproveitados}%</strong> reaproveitados ·{' '}
            {ausentesResumo.reaproveitados}/{ausentesResumo.total} ·{' '}
            {ausentesResumo.reaproveitaveis} marcados para reprotocolar
          </p>
        </Link>
      )}

      {visaoTabs.length > 1 && (
        <FamiliaTabs
          tabs={visaoTabs}
          activeId={visao}
          onChange={(id) => setVisao(id as VisaoAgenda)}
        />
      )}

      <FamiliaTabs
        tabs={PERIODOS.map((p) => ({ id: p.value, label: p.label }))}
        activeId={periodo}
        onChange={(id) => setPeriodo(id as Periodo)}
      />

      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="underline">
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && agendadasPorDia.dias.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-10 text-center text-sm text-[var(--color-text-secondary)]">
          {visao === 'minhas'
            ? 'Nenhuma audiência atribuída a você como pautista neste período.'
            : 'Nenhuma audiência agendada no período selecionado.'}
        </div>
      )}

      {!loading &&
        !error &&
        agendadasPorDia.dias.map((dia) => {
          const lista = agendadasPorDia.map.get(dia) ?? []
          return (
            <section key={dia} className="space-y-3">
              <h2 className="border-b border-[var(--color-border-default)] pb-2 font-mono text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                {tituloDiaPt(dia, lista.length)}
              </h2>
              <div className="mx-auto flex max-w-xl flex-col gap-4">
                {lista.map((a) => (
                  <AgendaCard
                    key={a.id}
                    audiencia={a}
                    readOnly={readOnly}
                    canEditPautista={canEditPautista}
                    onUpdated={load}
                  />
                ))}
              </div>
            </section>
          )
        })}
    </div>
  )
}
