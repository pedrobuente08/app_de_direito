'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAuditLog, getAuthMe } from '@/lib/api'
import type { AuditLogList } from '@/lib/types'

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogList | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [entidade, setEntidade] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [desde, setDesde] = useState('')
  const [ate, setAte] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAuditLog({
        page,
        limit: 50,
        entidade: entidade || undefined,
        usuarioId: usuarioId || undefined,
        desde: desde || undefined,
        ate: ate || undefined,
      })
      setData(res)
    } catch (e) {
      setData(null)
      if ((e as Error).message.includes('403') || (e as Error).message.includes('Forbidden')) {
        setDenied(true)
      }
    } finally {
      setLoading(false)
    }
  }, [page, entidade, usuarioId, desde, ate])

  useEffect(() => {
    getAuthMe()
      .then((me) => {
        if (me.perfil !== 'admin' && me.perfil !== 'adm') {
          setDenied(true)
          setLoading(false)
        } else {
          load()
        }
      })
      .catch(() => {
        setDenied(true)
        setLoading(false)
      })
  }, [load])

  if (denied) {
    return (
      <p className="text-sm text-[var(--urgencia-vencida-text)]">
        Acesso restrito a administradores do escritório.
      </p>
    )
  }

  return (
    <div className="animate-fade-in-up max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold">Audit log</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Alterações registradas por entidade, usuário e período (F4.7).
      </p>

      <div className="flex flex-wrap gap-2 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3">
        <input
          placeholder="Entidade (ex.: processo)"
          value={entidade}
          onChange={(e) => setEntidade(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        />
        <input
          placeholder="ID usuário"
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          className="rounded border px-2 py-1 text-sm font-mono"
        />
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        <button
          type="button"
          onClick={() => {
            setPage(1)
            load()
          }}
          className="rounded bg-[var(--color-brand)] px-3 py-1 text-sm text-white"
        >
          Filtrar
        </button>
      </div>

      {loading ? (
        <p className="text-sm">Carregando…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-bg-muted)] uppercase text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-2 py-2 text-left">Data</th>
                  <th className="px-2 py-2 text-left">Entidade</th>
                  <th className="px-2 py-2 text-left">Ação</th>
                  <th className="px-2 py-2 text-left">Usuário</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-[var(--color-border-default)]">
                    <td className="px-2 py-1 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-2 py-1">
                      {row.entidade} · <span className="font-mono">{row.entidadeId.slice(0, 8)}…</span>
                    </td>
                    <td className="px-2 py-1">{row.acao}</td>
                    <td className="px-2 py-1 font-mono">{row.usuarioId?.slice(0, 8) ?? '—'}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 disabled:opacity-40">
                Anterior
              </button>
              <span>
                {page} / {data.meta.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
