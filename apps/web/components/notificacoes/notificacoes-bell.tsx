'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconBell } from '@/components/ui/icon-bell'
import {
  getNotificacoes,
  getNotificacoesResumo,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from '@/lib/api'
import type { Notificacao } from '@/lib/types'

function hrefParaNotificacao(n: Notificacao): string | null {
  if (n.entidade === 'pendencia') return '/pendencias'
  if (n.entidade === 'processo') return '/intimacoes'
  return null
}

function labelPrioridade(p: string | null): string {
  if (p === 'ALTA') return 'Alta'
  if (p === 'MEDIA') return 'Média'
  if (p === 'BAIXA') return 'Baixa'
  return p ?? ''
}

function formatarData(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificacoesBell() {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [naoLidas, setNaoLidas] = useState(0)
  const [lista, setLista] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const refreshBadge = useCallback(async () => {
    try {
      const r = await getNotificacoesResumo()
      setNaoLidas(r.naoLidas)
    } catch {
      /* silencioso no polling */
    }
  }, [])

  const refreshLista = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const rows = await getNotificacoes(false)
      setLista(rows)
      setNaoLidas(rows.filter((n) => !n.lidaEm).length)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshBadge()
    const id = window.setInterval(() => void refreshBadge(), 60_000)
    return () => window.clearInterval(id)
  }, [refreshBadge])

  useEffect(() => {
    if (open) void refreshLista()
  }, [open, refreshLista])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  async function aoClicarItem(n: Notificacao) {
    if (!n.lidaEm) {
      try {
        await marcarNotificacaoLida(n.id)
        setLista((prev) =>
          prev.map((x) =>
            x.id === n.id ? { ...x, lidaEm: new Date().toISOString() } : x,
          ),
        )
        setNaoLidas((c) => Math.max(0, c - 1))
      } catch {
        /* segue navegação */
      }
    }
    const href = hrefParaNotificacao(n)
    setOpen(false)
    if (href) router.push(href)
  }

  async function marcarTodas() {
    try {
      await marcarTodasNotificacoesLidas()
      setLista((prev) =>
        prev.map((n) => ({ ...n, lidaEm: n.lidaEm ?? new Date().toISOString() })),
      )
      setNaoLidas(0)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          open
            ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
        }`}
        title="Notificações"
        aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <IconBell />
        {naoLidas > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--urgencia-vencida-text)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--color-bg-surface)]">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Painel de notificações"
          className="absolute right-0 top-full z-50 mt-2 flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Notificações
              {naoLidas > 0 ? (
                <span className="ml-2 font-normal text-[var(--color-text-secondary)]">
                  ({naoLidas} não lidas)
                </span>
              ) : null}
            </h2>
            {naoLidas > 0 ? (
              <button
                type="button"
                onClick={() => void marcarTodas()}
                className="text-xs font-medium text-[var(--color-brand)] hover:underline"
              >
                Marcar todas
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                Carregando…
              </p>
            ) : erro ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--urgencia-vencida-text)]">
                {erro}
              </p>
            ) : lista.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                Nenhuma notificação ainda.
                <br />
                <span className="text-xs">
                  Alertas de pendências e crons aparecem aqui.
                </span>
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border-default)]">
                {lista.map((n) => {
                  const naoLida = !n.lidaEm
                  const href = hrefParaNotificacao(n)
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => void aoClicarItem(n)}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-hover)] ${
                          naoLida ? 'bg-[var(--color-bg-subtle)]/80' : ''
                        }`}
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <span
                            className={`text-sm font-medium ${
                              naoLida
                                ? 'text-[var(--color-text-primary)]'
                                : 'text-[var(--color-text-secondary)]'
                            }`}
                          >
                            {n.titulo}
                          </span>
                          {n.prioridade === 'ALTA' ? (
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--urgencia-vencida-text)]">
                              {labelPrioridade(n.prioridade)}
                            </span>
                          ) : null}
                        </div>
                        {n.mensagem ? (
                          <p className="line-clamp-2 text-xs text-[var(--color-text-secondary)]">
                            {n.mensagem}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                          {formatarData(n.createdAt)}
                          {href ? ' · Abrir' : ''}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-[var(--color-border-default)] px-4 py-2 text-center">
            <Link
              href="/pendencias"
              className="text-xs text-[var(--color-brand)] hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver pendências
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
