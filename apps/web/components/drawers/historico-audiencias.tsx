'use client'

import { useEffect, useState } from 'react'
import {
  desfazerFinalizacaoAudiencia,
  getHistoricoAudienciasProcesso,
  type AudienciaHistoricoItem,
} from '@/lib/api'

const STATUS_LABEL: Record<string, string> = {
  REALIZADA: 'Realizada',
  REDESIGNADA: 'Redesignada',
  CANCELADA: 'Cancelada',
  ADIADA: 'Adiada',
}

const CENARIO_LABEL: Record<string, string> = {
  REVELIA: 'Revelia',
  TODOS_COMPARECERAM: 'Todos compareceram',
  SO_ADVOGADO: 'Só o advogado',
  UNA: 'Audiência una',
  FRACIONADA: 'Fracionada',
  DOCUMENTACAO_PENDENTE: 'Documentação pendente',
}

type Props = {
  processoId: string
  onChanged?: () => void
}

export function HistoricoAudiencias({ processoId, onChanged }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AudienciaHistoricoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [desfazendoId, setDesfazendoId] = useState<string | null>(null)
  const [avisoMsg, setAvisoMsg] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistoricoAudienciasProcesso(processoId)
      setItems(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getHistoricoAudienciasProcesso(processoId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, processoId])

  async function handleDesfazer(item: AudienciaHistoricoItem) {
    if (
      !window.confirm(
        'Desfazer a finalização desta audiência? O status volta para AGENDADA. Pendências e audiências derivadas (FRACIONADA/REVELIA/etc.) NÃO serão removidas automaticamente — você precisará tratá-las depois.',
      )
    ) {
      return
    }
    setDesfazendoId(item.id)
    setError(null)
    setAvisoMsg(null)
    try {
      const r = await desfazerFinalizacaoAudiencia(item.id)
      if (r.avisos.length > 0) {
        setAvisoMsg(r.avisos.join(' '))
      }
      await carregar()
      onChanged?.()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDesfazendoId(null)
    }
  }

  return (
    <div className="col-span-2 sm:col-span-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-[var(--color-brand)] hover:underline"
      >
        {open ? 'Ocultar histórico de audiências' : 'Histórico de audiências'}
      </button>
      {open ? (
        <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3">
          {error ? (
            <p className="text-xs text-[var(--urgencia-vencida-text)]">{error}</p>
          ) : null}
          {avisoMsg ? (
            <p className="rounded border border-amber-400/50 bg-amber-100/40 px-2 py-1 text-[11px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              {avisoMsg}
            </p>
          ) : null}
          {loading ? (
            <p className="text-xs text-[var(--color-text-secondary)]">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Nenhuma audiência finalizada.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="border-b border-[var(--color-border-default)] pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase text-[var(--color-text-tertiary)]">
                      {STATUS_LABEL[item.status] ?? item.status}
                      {item.tipo ? ` · ${item.tipo}` : ''}
                      {' · '}
                      {String(item.data).slice(0, 10)}
                      {item.hora ? ` ${String(item.hora).slice(0, 5)}` : ''}
                    </p>
                    {item.cenario ? (
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
                        Cenário: {CENARIO_LABEL[item.cenario] ?? item.cenario}
                        {item.autorPresenca
                          ? ` · Autor ${item.autorPresenca === 'PRESENTE' ? 'presente' : 'ausente'}`
                          : ''}
                        {item.reuPresenca
                          ? ` · Réu ${item.reuPresenca === 'PRESENTE' ? 'presente' : 'ausente'}`
                          : ''}
                      </p>
                    ) : null}
                    {item.obsPos ? (
                      <p className="mt-0.5 whitespace-pre-wrap text-xs text-[var(--color-text-primary)]">
                        {item.obsPos}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDesfazer(item)}
                    disabled={desfazendoId === item.id}
                    className="shrink-0 rounded border border-[var(--color-border-default)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] disabled:opacity-60"
                    title="Restaura a audiência para AGENDADA"
                  >
                    {desfazendoId === item.id ? 'Desfazendo…' : 'Desfazer'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
