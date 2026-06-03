'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSentencas, interporEmbargosDeclaracao } from '@/lib/api'
import type { Sentenca } from '@/lib/types'

export type EmbargosLinha = {
  processoId: string
  numero: string
}

type Props = {
  open: boolean
  item: EmbargosLinha | null
  onClose: () => void
  onSuccess: () => void
}

function isPrimeiroGrau(grau: string | null | undefined): boolean {
  if (!grau?.trim()) return true
  const g = grau.trim().toUpperCase()
  return !g.includes('SEGUNDO') && g !== 'STJ' && g !== 'TST'
}

export function PopUpEmbargosDeclaracao({
  open,
  item,
  onClose,
  onSuccess,
}: Props) {
  const [sentencas, setSentencas] = useState<Sentenca[]>([])
  const [sentencaId, setSentencaId] = useState('')
  const [origem, setOrigem] = useState<'NOS' | 'REU' | 'AMBOS'>('NOS')
  const [dataInterposicao, setDataInterposicao] = useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sentencas1g = useMemo(
    () => sentencas.filter((s) => isPrimeiroGrau(s.grau)),
    [sentencas],
  )

  useEffect(() => {
    if (!open || !item) return
    setError(null)
    void getSentencas(item.processoId)
      .then((rows) => {
        setSentencas(rows)
        const s1 = rows.find((s) => isPrimeiroGrau(s.grau))
        setSentencaId(s1?.id ?? '')
      })
      .catch((e) => setError((e as Error).message))
  }, [open, item])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!item || !sentencaId) {
      setError('Selecione a sentença de 1º grau.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await interporEmbargosDeclaracao({
        sentencaId,
        processoId: item.processoId,
        origem,
        dataInterposicao,
        observacoes: observacoes.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!open || !item) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 shadow-lg"
      >
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Embargos de declaração
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Processo {item.numero}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Sentença (1º grau)
            <select
              value={sentencaId}
              onChange={(e) => setSentencaId(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm"
              required
            >
              <option value="">Selecione…</option>
              {sentencas1g.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.data} — {s.resultado ?? '—'}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Origem
            <select
              value={origem}
              onChange={(e) =>
                setOrigem(e.target.value as 'NOS' | 'REU' | 'AMBOS')
              }
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm"
            >
              <option value="NOS">Nós</option>
              <option value="REU">Réu</option>
              <option value="AMBOS">Ambos</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Data de interposição
            <input
              type="date"
              value={dataInterposicao}
              onChange={(e) => setDataInterposicao(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Observações
            <textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm"
            />
          </label>

          {error ? (
            <p className="text-xs text-[var(--urgencia-vencida-text)]">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
