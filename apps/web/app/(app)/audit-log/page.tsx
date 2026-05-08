'use client'

import React, { useEffect, useState } from 'react'
import { getAuditLog } from '@/lib/api'
import type { AuditLog } from '@/lib/types'

type Meta = { page: number; limit: number; total: number; totalPages: number }

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const ACAO_CLASS: Record<string, string> = {
  CREATE: 'bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]',
  UPDATE: 'bg-[var(--urgencia-atencao-bg)] text-[var(--urgencia-atencao-text)]',
  DELETE: 'bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]',
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 50, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [filterEntidade, setFilterEntidade] = useState('')
  const [filterInput, setFilterInput] = useState('')
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  async function load(p: number, entidade: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await getAuditLog({ page: p, limit: 50, entidade: entidade || undefined })
      setLogs(res.data)
      setMeta(res.meta)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page, filterEntidade) }, [page, filterEntidade])

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setFilterEntidade(filterInput)
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Audit Log</h1>
        <form onSubmit={handleFiltrar} className="flex gap-2">
          <input
            value={filterInput}
            onChange={e => setFilterInput(e.target.value)}
            placeholder="Filtrar por entidade…"
            className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
          />
          <button type="submit"
            className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
            Filtrar
          </button>
          {filterEntidade && (
            <button type="button" onClick={() => { setFilterInput(''); setFilterEntidade(''); setPage(1) }}
              className="text-sm text-[var(--color-text-secondary)] hover:underline">
              Limpar
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />)}</div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error} <button onClick={() => load(page, filterEntidade)} className="underline">Tentar novamente</button>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhum registro encontrado.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-muted)]">
                <tr>
                  {['Data', 'Entidade', 'ID', 'Ação', 'Usuário', ''].map(col => (
                    <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-[var(--color-bg-hover)]">
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-primary)]">{log.entidade}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                        {log.entidadeId.length > 12 ? log.entidadeId.slice(0, 8) + '…' : log.entidadeId}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACAO_CLASS[log.acao] ?? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]'}`}>
                          {log.acao}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                        {log.usuarioId ? log.usuarioId.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {log.diff && Object.keys(log.diff).length > 0 && (
                          <button onClick={() => setExpandidoId(expandidoId === log.id ? null : log.id)}
                            className="text-xs text-[var(--color-brand)] hover:underline">
                            {expandidoId === log.id ? 'Fechar' : 'Ver diff'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandidoId === log.id && (
                      <tr key={`${log.id}-diff`}>
                        <td colSpan={6} className="bg-[var(--color-bg-subtle)] px-4 py-3">
                          <pre className="overflow-x-auto text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap">
                            {JSON.stringify(log.diff, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* paginação */}
          {meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
              <span>{meta.total} registros · página {meta.page} de {meta.totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-1.5 hover:bg-[var(--color-bg-hover)] disabled:opacity-40">
                  ← Anterior
                </button>
                <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-1.5 hover:bg-[var(--color-bg-hover)] disabled:opacity-40">
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
