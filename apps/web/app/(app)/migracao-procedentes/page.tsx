'use client'

import { useState } from 'react'
import { previewMigracaoComplemento } from '@/lib/api'

export default function MigracaoProcedentesPage() {
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof previewMigracaoComplemento>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function analisar() {
    setLoading(true)
    setError(null)
    try {
      const linhas = raw.split('\n').map((l) => l.trim()).filter(Boolean)
      setResult(await previewMigracaoComplemento(linhas))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in-up max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold">Migração planilha — COMPLEMENTO</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Ferramenta one-off (F3.2): cole valores da coluna COMPLEMENTO (um por linha) para preview da
        decomposição. Aprovação manual e gravação em massa ficam para etapa posterior.
      </p>

      <textarea
        rows={12}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={'ED DO REU NAO ACOLHIDO\nRI MAJOROU\nPROCURAÇÃO P/ ALVARÁ'}
        className="w-full rounded border border-[var(--color-border-default)] px-3 py-2 font-mono text-sm"
      />

      <button
        type="button"
        disabled={loading || !raw.trim()}
        onClick={analisar}
        className="rounded bg-[var(--color-brand)] px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? 'Analisando…' : 'Preview'}
      </button>

      {error && <p className="text-sm text-[var(--urgencia-vencida-text)]">{error}</p>}

      {result && (
        <div className="space-y-2 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <p className="text-sm">
            Total: <strong>{result.total}</strong> · Auto ≥80%: <strong>{result.autoMapeaveis}</strong> (
            {result.pctAuto}%)
          </p>
          <ul className="max-h-96 space-y-2 overflow-y-auto text-xs">
            {result.candidatos.map((c, i) => (
              <li key={i} className="rounded bg-[var(--color-bg-muted)] p-2">
                <p className="font-medium">{c.entrada}</p>
                <p className="text-[var(--color-text-secondary)]">
                  Confiança {Math.round(c.confianca * 100)}%
                  {c.recursoTipo ? ` · ${c.recursoTipo}/${c.recursoOrigem}/${c.recursoResultado}` : ''}
                  {c.docPendente?.length ? ` · docs: ${c.docPendente.join(', ')}` : ''}
                  {c.sentencaResultado ? ` · sentença: ${c.sentencaResultado}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
