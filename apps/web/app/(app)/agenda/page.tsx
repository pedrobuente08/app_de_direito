'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAudiencias, getAuthMe } from '@/lib/api'
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

export default function AgendaPage() {
  const [rows, setRows] = useState<Audiencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readOnly, setReadOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getAudiencias())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getAuthMe()
      .then((me) => setReadOnly(me.perfil === 'leitura'))
      .catch(() => setReadOnly(false))
  }, [])

  const agendadasPorDia = useMemo(() => {
    const ag = rows
      .filter((a) => a.status === 'AGENDADA')
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
    return { map, dias }
  }, [rows])

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Agenda</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Cartões por dia no formato operacional (briefing): cliente, contato, réu, adversário, matéria/vara/tipo,
          qualidade e ações.
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && agendadasPorDia.dias.length === 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-10 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhuma audiência agendada.
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
                  <AgendaCard key={a.id} audiencia={a} readOnly={readOnly} onUpdated={load} />
                ))}
              </div>
            </section>
          )
        })}
    </div>
  )
}
