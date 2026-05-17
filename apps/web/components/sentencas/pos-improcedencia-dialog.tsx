'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { aplicarPosImprocedencia } from '@/lib/api'
import type { Sentenca } from '@/lib/types'

const DECISOES = [
  { id: 'RECORRER' as const, label: 'Recorrer' },
  { id: 'NAO_RECORRER' as const, label: 'Não recorrer' },
  { id: 'AVALIAR' as const, label: 'Avaliar (prazo)' },
]

type Props = {
  open: boolean
  processoId: string
  processoNumero?: string | null
  sentenca: Sentenca | null
  onClose: () => void
  onSuccess: () => void
}

export function PosImprocedenciaDialog({
  open,
  processoId,
  processoNumero,
  sentenca,
  onClose,
  onSuccess,
}: Props) {
  const [decisao, setDecisao] = useState<'RECORRER' | 'NAO_RECORRER' | 'AVALIAR'>('AVALIAR')
  const [valor, setValor] = useState('')
  const [observacao, setObservacao] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [prazoDias, setPrazoDias] = useState('7')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !sentenca) return
    setDecisao('AVALIAR')
    setValor(sentenca.valor ?? '')
    setObservacao('')
    setResponsavel('')
    setPrazoDias('7')
    setErro(null)
  }, [open, sentenca])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !sentenca || typeof document === 'undefined') return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      await aplicarPosImprocedencia(processoId, {
        sentencaId: sentenca.id,
        decisao,
        valorSucumbencia: valor.trim() || null,
        observacao: observacao.trim() || null,
        responsavel: responsavel.trim() || null,
        ...(decisao === 'AVALIAR' && prazoDias.trim()
          ? { prazoDias: Number(prazoDias) }
          : {}),
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
        className="fixed left-1/2 top-1/2 z-[61] flex max-h-[min(90vh,36rem)] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Sentença improcedente
          </h2>
          <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
            {processoNumero ?? processoId}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Data {sentenca.data} — defina a estratégia de recurso.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-4 py-3">
          {erro ? (
            <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p>
          ) : null}

          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Valor (sucumbência ou 0)
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0.00"
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[var(--color-text-secondary)]">
              Decisão sobre recurso *
            </legend>
            {DECISOES.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="decisao"
                  value={d.id}
                  checked={decisao === d.id}
                  onChange={() => setDecisao(d.id)}
                />
                {d.label}
              </label>
            ))}
          </fieldset>

          {decisao === 'AVALIAR' ? (
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Prazo para decidir (dias)
              <input
                type="number"
                min={1}
                value={prazoDias}
                onChange={(e) => setPrazoDias(e.target.value)}
                className="w-24 rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Responsável
            <input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Observações
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={salvando}
              className="rounded bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[var(--color-border-default)] px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body,
  )
}
