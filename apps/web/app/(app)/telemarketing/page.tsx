'use client'

import { useCallback, useEffect, useState } from 'react'
import { Btn } from '@/components/ui/btn'
import { KpiCard } from '@/components/ui/kpi-card'
import {
  cumprirTelemarketingPendencia,
  getTelemarketingLista,
  getTelemarketingResumo,
  puxarTelemarketingFila,
} from '@/lib/api'
import { urgenciaPendencia } from '@/lib/pendencia-urgencia'
import type { TelemarketingLinha, TelemarketingResumo } from '@/lib/types'
import { ToastContainer, useToast } from '@/lib/toast'

export default function TelemarketingPage() {
  const toast = useToast()
  const [resumo, setResumo] = useState<TelemarketingResumo | null>(null)
  const [lista, setLista] = useState<TelemarketingLinha[]>([])
  const [loading, setLoading] = useState(true)
  const [somenteMinhas, setSomenteMinhas] = useState(false)
  const [puxando, setPuxando] = useState(false)
  const [cumprirId, setCumprirId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, rows] = await Promise.all([
        getTelemarketingResumo(),
        getTelemarketingLista(somenteMinhas),
      ])
      setResumo(r)
      setLista(rows)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [somenteMinhas, toast])

  useEffect(() => {
    void load()
  }, [load])

  async function handlePuxar() {
    setPuxando(true)
    try {
      await puxarTelemarketingFila()
      toast.success('Pendência atribuída a você.')
      setSomenteMinhas(true)
      void load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setPuxando(false)
    }
  }

  async function handleCumprir(e: React.FormEvent) {
    e.preventDefault()
    if (!cumprirId || !motivo.trim()) return
    setSalvando(true)
    try {
      await cumprirTelemarketingPendencia(cumprirId, {
        motivoCumprimento: motivo.trim(),
      })
      toast.success('Pendência cumprida.')
      setCumprirId(null)
      setMotivo('')
      void load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Telemarketing
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Fila TELEMARKETING — puxe da fila ou cumpra suas pendências.
          </p>
        </div>
        <Btn variant="primary" loading={puxando} onClick={() => void handlePuxar()}>
          Puxar da fila
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Abertas" value={resumo?.abertas ?? '—'} variant="default" />
        <KpiCard label="Vencendo ≤3d" value={resumo?.vencendo ?? '—'} variant="warning" />
        <KpiCard label="Na fila" value={resumo?.naFila ?? '—'} variant="accent" />
        <KpiCard label="Cumpridas 30d" value={resumo?.cumpridas30d ?? '—'} variant="success" />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSomenteMinhas(false)}
          className={`rounded-full px-3 py-1 text-xs ${
            !somenteMinhas
              ? 'bg-[var(--color-brand)] text-white'
              : 'border border-[var(--color-border-default)]'
          }`}
        >
          Todas abertas
        </button>
        <button
          type="button"
          onClick={() => setSomenteMinhas(true)}
          className={`rounded-full px-3 py-1 text-xs ${
            somenteMinhas
              ? 'bg-[var(--color-brand)] text-white'
              : 'border border-[var(--color-border-default)]'
          }`}
        >
          Minhas
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Nenhuma pendência na fila com este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {lista.map(({ pendencia: p, processo: proc }) => {
            const urg = urgenciaPendencia(p.dataLimite)
            const itemClass =
              urg.bucket === 'vencidos'
                ? 'tlm-item tlm-item--vencida'
                : urg.bucket === 'urgente'
                  ? 'tlm-item tlm-item--urgente'
                  : 'tlm-item'
            return (
              <li key={p.id} className={itemClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-medium">{proc.numero}</p>
                    <p className="text-sm font-medium">{proc.clienteNome ?? '—'}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {p.tipo} · {p.responsavel ?? 'Sem responsável'}
                    </p>
                    {proc.telefone ? (
                      <p className="mt-1 text-xs">{proc.telefone}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: urg.bg,
                        color: urg.text,
                        border: `1px solid ${urg.border}`,
                      }}
                    >
                      {p.dataLimite ? `${urg.label} · ${p.dataLimite}` : urg.label}
                    </span>
                    <Btn
                      variant="primary"
                      className="!px-2 !py-1 text-xs"
                      onClick={() => {
                        setCumprirId(p.id)
                        setMotivo('')
                      }}
                    >
                      Cumprir
                    </Btn>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {cumprirId ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setCumprirId(null)}
            aria-hidden
          />
          <form
            onSubmit={handleCumprir}
            className="fixed left-1/2 top-1/2 z-[51] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 shadow-lg"
          >
            <h2 className="text-sm font-semibold">Cumprir pendência</h2>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo / observação do cumprimento"
              className="mt-2 w-full rounded border px-2 py-1.5 text-sm"
            />
            <div className="mt-3 flex gap-2">
              <Btn type="submit" variant="primary" loading={salvando}>
                Confirmar
              </Btn>
              <Btn type="button" variant="default" onClick={() => setCumprirId(null)}>
                Cancelar
              </Btn>
            </div>
          </form>
        </>
      ) : null}
    </div>
  )
}
