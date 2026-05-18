'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSentencas, registrarSegundoGrau } from '@/lib/api'

const CENARIOS = [
  { id: 'A' as const, label: 'A — Provimento (vira procedente)' },
  { id: 'B' as const, label: 'B — Negado (permanece improcedente)' },
  { id: 'C' as const, label: 'C — Manutenção (réu recorreu)' },
  { id: 'D' as const, label: 'D — Reforma (vira improcedente)' },
]

export type RecursoLinha = {
  processoId: string
  numero: string
  origemRecurso?: 'NOSSO' | 'REU' | null
}

type Props = {
  open: boolean
  item: RecursoLinha | null
  onClose: () => void
  onSuccess: () => void
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
}

export function RegistrarSegundoGrauDialog({
  open,
  item,
  onClose,
  onSuccess,
}: Props) {
  const [cenario, setCenario] = useState<'A' | 'B' | 'C' | 'D'>('A')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [valor, setValor] = useState('')
  const [turma, setTurma] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ultimo1g, setUltimo1g] = useState<string | null>(null)

  const cenariosFiltrados = useMemo(() => {
    if (!ultimo1g) return CENARIOS
    const r = norm(ultimo1g)
    if (r === 'IMPROCEDENTE') {
      return CENARIOS.filter((c) => c.id === 'A' || c.id === 'B')
    }
    if (['PROCEDENTE', 'PARCIAL', 'ACORDO'].includes(r)) {
      return CENARIOS.filter((c) => c.id === 'C' || c.id === 'D')
    }
    return CENARIOS
  }, [ultimo1g])

  useEffect(() => {
    if (!open || !item) return
    setData(new Date().toISOString().slice(0, 10))
    setValor('')
    setTurma('')
    setObservacoes('')
    setErro(null)
    setUltimo1g(null)
    getSentencas(item.processoId)
      .then((rows) => {
        const s1 = rows.find(
          (s) =>
            !s.grau?.toUpperCase().includes('SEGUNDO') &&
            s.grau !== 'STJ' &&
            s.grau !== 'TST',
        )
        const r = s1?.resultado ?? null
        setUltimo1g(r)
        if (r && norm(r) === 'IMPROCEDENTE') setCenario('A')
        else if (r) setCenario('C')
      })
      .catch(() => setUltimo1g(null))
  }, [open, item])

  useEffect(() => {
    if (cenariosFiltrados.length && !cenariosFiltrados.some((c) => c.id === cenario)) {
      setCenario(cenariosFiltrados[0]!.id)
    }
  }, [cenariosFiltrados, cenario])

  if (!open || !item || typeof document === 'undefined') return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!item) return
    setSalvando(true)
    setErro(null)
    try {
      await registrarSegundoGrau({
        processoId: item.processoId,
        cenario,
        data,
        valor: valor.trim() || null,
        turma: turma.trim() || null,
        observacoes: observacoes.trim() || null,
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
        className="fixed left-1/2 top-1/2 z-[61] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">Registrar acórdão (2º grau)</h2>
        <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
          {item.numero}
        </p>
        {ultimo1g ? (
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            1º grau: {ultimo1g}
            {item.origemRecurso
              ? ` · Origem: ${item.origemRecurso === 'NOSSO' ? 'nosso recurso' : 'réu'}`
              : ''}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {erro ? <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p> : null}
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Cenário
            <select
              value={cenario}
              onChange={(e) => setCenario(e.target.value as 'A' | 'B' | 'C' | 'D')}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            >
              {cenariosFiltrados.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Data
            <input
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Valor (opcional)
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Turma (opcional)
            <input
              value={turma}
              onChange={(e) => setTurma(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Confirmar'}
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
