'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  criarSucessor,
  criarTutela,
  getAddonsStatus,
  getSucessores,
  getTutelas,
  habilitarSucessor,
  atualizarTutela,
} from '@/lib/api'
import type { ProcessoSucessor, TutelaAntecipada } from '@/lib/types'
import { AutorFalecidoDialog } from './autor-falecido-dialog'

type ToastApi = {
  success: (m: string) => void
  error: (m: string) => void
}

type Props = {
  processoId: string
  processoNumero?: string | null
  readOnly?: boolean
  toast: ToastApi
  onProcessoUpdated?: () => void
}

function tutelaStatusBadge(t: TutelaAntecipada) {
  if (t.cumprida) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-800">
        Cumprida
      </span>
    )
  }
  const r = (t.resultado ?? 'PENDENTE').toUpperCase()
  if (r === 'DEFERIDA' || r === 'PARCIALMENTE_DEFERIDA') {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-800">
        Deferida
      </span>
    )
  }
  if (r === 'INDEFERIDA') {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-800">
        Indeferida
      </span>
    )
  }
  if (r === 'REVOGADA') {
    return (
      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-700">
        Revogada
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
      Pendente
    </span>
  )
}

const TIPO_TUTELA_LABEL: Record<string, string> = {
  TUTELA_ANTECIPADA: 'Tutela antecipada',
  TUTELA_CAUTELAR: 'Tutela cautelar',
  LIMINAR: 'Liminar',
}

export function ProWorkflowsSection({
  processoId,
  processoNumero,
  readOnly,
  toast,
  onProcessoUpdated,
}: Props) {
  const [ativo, setAtivo] = useState(false)
  const [tutelas, setTutelas] = useState<TutelaAntecipada[]>([])
  const [sucessores, setSucessores] = useState<ProcessoSucessor[]>([])
  const [loading, setLoading] = useState(true)
  const [falecidoOpen, setFalecidoOpen] = useState(false)

  const [novoTipo, setNovoTipo] = useState<'TUTELA_ANTECIPADA' | 'TUTELA_CAUTELAR' | 'LIMINAR'>(
    'TUTELA_ANTECIPADA',
  )
  const [novoPedidoEm, setNovoPedidoEm] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [novoDescricao, setNovoDescricao] = useState('')
  const [novoPrazo, setNovoPrazo] = useState('')

  const reload = useCallback(async () => {
    if (!ativo) return
    try {
      const [t, s] = await Promise.all([
        getTutelas(processoId),
        getSucessores(processoId),
      ])
      setTutelas(t)
      setSucessores(s)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [ativo, processoId, toast])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getAddonsStatus()
      .then((st) => {
        if (cancelled) return
        const on = !!st.addons.workflows_raros
        setAtivo(on)
        if (!on) {
          setLoading(false)
          return
        }
        return reload().finally(() => {
          if (!cancelled) setLoading(false)
        })
      })
      .catch(() => {
        if (!cancelled) {
          setAtivo(false)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [processoId, reload])

  if (!ativo) return null

  if (loading) {
    return (
      <p className="text-xs text-[var(--color-text-secondary)]">Carregando workflows PRO…</p>
    )
  }

  return (
    <div>
      <p className="mb-3 border-b border-[var(--color-border-default)] pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        Workflows PRO
      </p>
      <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
          Tutela / liminar
        </p>
        {tutelas.length === 0 ? (
          <p className="mb-2 text-xs text-[var(--color-text-secondary)]">
            Nenhuma tutela registrada.
          </p>
        ) : (
          <ul className="mb-3 space-y-2">
            {tutelas.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-2 rounded border border-[var(--color-border-default)] px-2 py-1.5 text-xs"
              >
                <span className="font-medium">
                  {TIPO_TUTELA_LABEL[t.tipo] ?? t.tipo} — {t.pedidoEm}
                </span>
                {tutelaStatusBadge(t)}
                {t.prazoCumprimento ? (
                  <span className="text-[var(--color-text-secondary)]">
                    Prazo: {t.prazoCumprimento}
                  </span>
                ) : null}
                {!readOnly && !t.cumprida ? (
                  <button
                    type="button"
                    className="ml-auto text-[var(--color-brand)] hover:underline"
                    onClick={async () => {
                      try {
                        await atualizarTutela(t.id, {
                          cumprida: true,
                          cumpridaEm: new Date().toISOString().slice(0, 10),
                        })
                        toast.success('Tutela marcada como cumprida.')
                        void reload()
                      } catch (e) {
                        toast.error((e as Error).message)
                      }
                    }}
                  >
                    Marcar cumprida
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {!readOnly ? (
          <form
            className="grid gap-2 rounded border border-dashed border-[var(--color-border-default)] p-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await criarTutela(processoId, {
                  tipo: novoTipo,
                  pedidoEm: novoPedidoEm,
                  descricao: novoDescricao.trim() || undefined,
                  prazoCumprimento: novoPrazo || undefined,
                })
                toast.success('Tutela registrada.')
                setNovoDescricao('')
                setNovoPrazo('')
                void reload()
              } catch (err) {
                toast.error((err as Error).message)
              }
            }}
          >
            <select
              value={novoTipo}
              onChange={(e) =>
                setNovoTipo(
                  e.target.value as 'TUTELA_ANTECIPADA' | 'TUTELA_CAUTELAR' | 'LIMINAR',
                )
              }
              className="rounded border px-2 py-1.5 text-sm"
            >
              <option value="TUTELA_ANTECIPADA">Tutela antecipada</option>
              <option value="TUTELA_CAUTELAR">Tutela cautelar</option>
              <option value="LIMINAR">Liminar</option>
            </select>
            <input
              type="date"
              required
              value={novoPedidoEm}
              onChange={(e) => setNovoPedidoEm(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={novoPrazo}
              onChange={(e) => setNovoPrazo(e.target.value)}
              placeholder="Prazo cumprimento"
              className="rounded border px-2 py-1.5 text-sm sm:col-span-2"
            />
            <input
              value={novoDescricao}
              onChange={(e) => setNovoDescricao(e.target.value)}
              placeholder="Descrição do pedido"
              className="rounded border px-2 py-1.5 text-sm sm:col-span-2"
            />
            <button
              type="submit"
              className="text-left text-xs text-[var(--color-brand)] hover:underline sm:col-span-2"
            >
              + Registrar tutela
            </button>
          </form>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
          Sucessores
        </p>
        {!readOnly ? (
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="text-xs text-[var(--color-brand)] hover:underline"
              onClick={() => setFalecidoOpen(true)}
            >
              Registrar óbito do autor
            </button>
          </div>
        ) : null}
        {sucessores.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)]">
            Nenhum sucessor cadastrado.
          </p>
        ) : (
          <ul className="space-y-2">
            {sucessores.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded border border-[var(--color-border-default)] px-2 py-1.5 text-xs"
              >
                <span className="font-medium">{s.nome}</span>
                {s.parentesco ? (
                  <span className="text-[var(--color-text-secondary)]">{s.parentesco}</span>
                ) : null}
                {s.habilitado ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-800">
                    Habilitado
                    {s.habilitadoEm ? ` (${s.habilitadoEm})` : ''}
                  </span>
                ) : (
                  <>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
                      Aguardando habilitação
                    </span>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="ml-auto text-[var(--color-brand)] hover:underline"
                        onClick={async () => {
                          try {
                            await habilitarSucessor(s.id)
                            toast.success('Sucessor habilitado.')
                            void reload()
                            onProcessoUpdated?.()
                          } catch (e) {
                            toast.error((e as Error).message)
                          }
                        }}
                      >
                        Habilitar
                      </button>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {!readOnly && sucessores.length > 0 ? (
          <button
            type="button"
            className="mt-2 text-xs text-[var(--color-brand)] hover:underline"
            onClick={async () => {
              const nome = window.prompt('Nome do sucessor')
              if (!nome?.trim()) return
              try {
                await criarSucessor(processoId, { nome: nome.trim() })
                toast.success('Sucessor adicionado.')
                void reload()
              } catch (e) {
                toast.error((e as Error).message)
              }
            }}
          >
            + Adicionar herdeiro
          </button>
        ) : null}
      </div>

      <AutorFalecidoDialog
        open={falecidoOpen}
        processoId={processoId}
        processoNumero={processoNumero}
        onClose={() => setFalecidoOpen(false)}
        onSuccess={() => {
          toast.success('Óbito registrado — processo sobrestado.')
          void reload()
          onProcessoUpdated?.()
        }}
      />
      </div>
    </div>
  )
}
