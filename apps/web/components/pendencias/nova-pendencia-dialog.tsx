'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { criarPendencia, getEscritorioConfig } from '@/lib/api'
import type { Processo } from '@/lib/types'

type Props = {
  open: boolean
  processo: Processo | null
  onClose: () => void
  onSuccess: () => void
}

export function NovaPendenciaDialog({
  open,
  processo,
  onClose,
  onSuccess,
}: Props) {
  const [tipo, setTipo] = useState('')
  const [dataLimite, setDataLimite] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tiposSugeridos, setTiposSugeridos] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    getEscritorioConfig()
      .then((cfg) => setTiposSugeridos(cfg.tipos_pendencia ?? []))
      .catch(() => setTiposSugeridos([]))
    setTipo('')
    setDataLimite('')
    setResponsavel('')
    setObservacao('')
    setErro(null)
  }, [open, processo?.id])

  if (!open || !processo || typeof document === 'undefined') return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!processo) return
    if (!tipo.trim()) {
      setErro('Informe o tipo da pendência.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await criarPendencia({
        processoId: processo.id,
        tipo: tipo.trim(),
        dataLimite: dataLimite.trim() || null,
        responsavel: responsavel.trim() || null,
        observacao: observacao.trim() || null,
        origem: 'MANUAL_INTIMACOES',
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[61] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">Nova pendência</h2>
        <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
          {processo.numero}
        </p>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {erro ? (
            <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p>
          ) : null}
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Tipo *
            <input
              required
              list="tipos-pendencia-opts"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Ex.: MANIFESTAR, PROCURAÇÃO…"
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
            {tiposSugeridos.length > 0 && (
              <datalist id="tipos-pendencia-opts">
                {tiposSugeridos.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            )}
          </label>
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Data limite
            <input
              type="date"
              value={dataLimite}
              onChange={(e) => setDataLimite(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Responsável
            <input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Observação
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Criar'}
            </button>
            <button type="button" onClick={onClose} className="text-sm underline">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body,
  )
}
