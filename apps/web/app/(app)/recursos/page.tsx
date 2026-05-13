'use client'

import { useEffect, useState } from 'react'
import { getAuthMe, registrarSegundoGrau } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'

const CENARIOS = [
  { id: 'A' as const, label: 'A — Provimento (1º improcedente → procedentes)' },
  { id: 'B' as const, label: 'B — Negado (permanece improcedência / sucumbência)' },
  { id: 'C' as const, label: 'C — Manutenção (1º procedente, réu recorreu)' },
  { id: 'D' as const, label: 'D — Reforma (sai de procedentes → improcedentes)' },
]

export default function RecursosPage() {
  const toast = useToast()
  const [readOnly, setReadOnly] = useState(false)
  const [processoId, setProcessoId] = useState('')
  const [cenario, setCenario] = useState<'A' | 'B' | 'C' | 'D'>('A')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [valor, setValor] = useState('')
  const [turma, setTurma] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAuthMe()
      .then((me) => setReadOnly(me.perfil === 'leitura'))
      .catch(() => setReadOnly(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pid = processoId.trim()
    if (!pid) {
      toast.error('Informe o UUID do processo.')
      return
    }
    setLoading(true)
    try {
      const res = await registrarSegundoGrau({
        processoId: pid,
        cenario,
        data,
        valor: valor.trim() || null,
        turma: turma.trim() || null,
        observacoes: observacoes.trim() || null,
      })
      toast.success(`Cenário ${res.cenario} registrado. ${res.sentencas.length} sentença(s) no histórico.`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Recursos</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Registro de decisão de 2º grau conforme os quatro cenários do plano (E4). A API valida a última
          sentença de 1º grau e aplica efeitos em <code className="rounded bg-[var(--color-bg-subtle)] px-1 font-mono text-xs">sentenca</code>,{' '}
          <code className="rounded bg-[var(--color-bg-subtle)] px-1 font-mono text-xs">processo_procedente</code> e{' '}
          <code className="rounded bg-[var(--color-bg-subtle)] px-1 font-mono text-xs">improcedente</code>.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-lg space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4"
      >
        <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
          Processo (UUID)
          <input
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
            value={processoId}
            onChange={(e) => setProcessoId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            disabled={readOnly}
          />
        </label>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
          Cenário
          <select
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
            value={cenario}
            onChange={(e) => setCenario(e.target.value as 'A' | 'B' | 'C' | 'D')}
            disabled={readOnly}
          >
            {CENARIOS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
          Data da decisão (2º grau)
          <input
            type="date"
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
            value={data}
            onChange={(e) => setData(e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
          Valor (opcional)
          <input
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0.00"
            disabled={readOnly}
          />
        </label>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
          Turma (opcional)
          <input
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
            value={turma}
            onChange={(e) => setTurma(e.target.value)}
            disabled={readOnly}
          />
        </label>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
          Observações (opcional)
          <textarea
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            disabled={readOnly}
          />
        </label>
        <button
          type="submit"
          disabled={readOnly || loading}
          className="rounded bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Enviando…' : 'Registrar 2º grau'}
        </button>
        {readOnly && (
          <p className="text-xs text-amber-700">Perfil somente leitura — não é possível enviar.</p>
        )}
      </form>
    </div>
  )
}
