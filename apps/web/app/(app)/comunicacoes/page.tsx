'use client'

import React, { useEffect, useState } from 'react'
import { cadastrarOab, getComunicacoes, getOabs } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Comunicacao, OabEscuta } from '@/lib/types'

const STATUS_CLASS: Record<string, string> = {
  LIDA: 'bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]',
  NAO_LIDA: 'bg-[var(--urgencia-atencao-bg)] text-[var(--urgencia-atencao-text)]',
  ORFA: 'bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]',
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function ComunicacoesPage() {
  const [comunicacoes, setComunicacoes] = useState<Comunicacao[]>([])
  const [oabs, setOabs] = useState<OabEscuta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [novaOab, setNovaOab] = useState('')
  const [savingOab, setSavingOab] = useState(false)
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const toast = useToast()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [c, o] = await Promise.all([getComunicacoes(), getOabs()])
      setComunicacoes(c)
      setOabs(o)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCadastrarOab(e: React.FormEvent) {
    e.preventDefault()
    setSavingOab(true)
    try {
      await cadastrarOab(novaOab)
      toast.success('OAB cadastrada.')
      setNovaOab('')
      const updated = await getOabs()
      setOabs(updated)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSavingOab(false)
    }
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Comunicações</h1>

      {/* OABs monitoradas */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">OABs monitoradas</h2>
        <form onSubmit={handleCadastrarOab} className="mb-3 flex gap-2">
          <input
            value={novaOab}
            onChange={e => setNovaOab(e.target.value.toUpperCase())}
            placeholder="Ex: SP123456"
            required
            className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm font-mono focus:border-[var(--color-brand)] focus:outline-none"
          />
          <button type="submit" disabled={savingOab}
            className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50">
            {savingOab ? 'Cadastrando…' : 'Adicionar'}
          </button>
        </form>
        {oabs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhuma OAB cadastrada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {oabs.map(o => (
              <span key={o.id} className="rounded-full bg-[var(--color-bg-muted)] px-3 py-1 text-xs font-mono text-[var(--color-text-primary)]">
                {o.oab}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Lista de comunicações */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />)}</div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error} <button onClick={load} className="underline">Tentar novamente</button>
        </div>
      ) : comunicacoes.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhuma comunicação recebida.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {['Data', 'OAB', 'Processo', 'Tipo', 'Status', ''].map(col => (
                  <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {comunicacoes.map(c => (
                <React.Fragment key={c.id}>
                  <tr className="hover:bg-[var(--color-bg-hover)]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-secondary)]">
                      {formatDate(c.dataDisponibilizacao ?? c.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-primary)]">{c.oab}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
                      {c.numeroProcessoBruto ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">{c.tipo ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[c.status] ?? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.resumo && (
                        <button onClick={() => setExpandidoId(expandidoId === c.id ? null : c.id)}
                          className="text-xs text-[var(--color-brand)] hover:underline">
                          {expandidoId === c.id ? 'Fechar' : 'Ver resumo'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandidoId === c.id && (
                    <tr>
                      <td colSpan={6} className="bg-[var(--color-bg-subtle)] px-4 py-3">
                        <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap">{c.resumo}</p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
