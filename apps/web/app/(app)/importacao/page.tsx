'use client'

import { useState } from 'react'
import { importarProcessosCsv } from '@/lib/api'
import type { ImportResult } from '@/lib/types'

const CSV_EXEMPLO = `numero,sistema,cliente_nome,cliente_cpf,reu_texto,vara,materia,login,data_distribuicao
0001234-56.2023.8.26.0001,ESAJ,João da Silva,123.456.789-00,Banco XPTO,1ª Vara Cível,BANCARIO,usuario@tj,2023-01-15`

export default function ImportacaoPage() {
  const [csv, setCsv] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImportar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResultado(null)
    try {
      const res = await importarProcessosCsv(csv)
      setResultado(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in-up max-w-3xl space-y-5">
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Importação de processos</h1>

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
        <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
          Cole um CSV com a primeira linha sendo o cabeçalho. Campos obrigatórios: <code className="rounded bg-[var(--color-bg-subtle)] px-1 font-mono text-xs">numero</code> e <code className="rounded bg-[var(--color-bg-subtle)] px-1 font-mono text-xs">sistema</code>.
        </p>

        <details className="mb-4">
          <summary className="cursor-pointer text-xs text-[var(--color-brand)] hover:underline">Ver exemplo de CSV</summary>
          <pre className="mt-2 overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] p-3 text-xs text-[var(--color-text-secondary)]">{CSV_EXEMPLO}</pre>
        </details>

        <form onSubmit={handleImportar} className="space-y-3">
          <textarea
            value={csv}
            onChange={e => setCsv(e.target.value)}
            required
            rows={12}
            placeholder={CSV_EXEMPLO}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-2 font-mono text-xs focus:border-[var(--color-brand)] focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading || !csv.trim()}
              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50">
              {loading ? 'Importando…' : 'Importar'}
            </button>
            {csv && (
              <button type="button" onClick={() => { setCsv(''); setResultado(null); setError(null) }}
                className="text-sm text-[var(--color-text-secondary)] hover:underline">
                Limpar
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error}
        </div>
      )}

      {resultado && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-4">
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-brand)]">{resultado.importados}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">importados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{resultado.totalLinhas}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">total de linhas</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${resultado.erros.length > 0 ? 'text-[var(--urgencia-vencida-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                {resultado.erros.length}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">erros</p>
            </div>
          </div>

          {resultado.erros.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--urgencia-vencida-text)]">Linhas com erro</p>
              <div className="space-y-1 rounded-[var(--radius-sm)] bg-[var(--urgencia-vencida-bg)] p-3">
                {resultado.erros.map((err, i) => (
                  <p key={i} className="text-xs text-[var(--urgencia-vencida-text)]">
                    <span className="font-semibold">Linha {err.linha}:</span> {err.mensagem}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
