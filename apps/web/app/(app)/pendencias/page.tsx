'use client'

import { useEffect, useState } from 'react'
import { criarPendencia, cumprirPendencia, getPendencias } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Pendencia } from '@/lib/types'

type UrgClass = { bg: string; text: string; border: string; label: string }

function urgencia(dataLimite?: string | null): UrgClass {
  if (!dataLimite) {
    return {
      bg: 'var(--urgencia-sem-prazo-bg)',
      text: 'var(--urgencia-sem-prazo-text)',
      border: 'var(--urgencia-sem-prazo-border)',
      label: 'Sem prazo',
    }
  }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limite = new Date(dataLimite + 'T00:00:00')
  const dias = Math.floor((limite.getTime() - hoje.getTime()) / 86_400_000)
  if (dias < 0)
    return { bg: 'var(--urgencia-vencida-bg)', text: 'var(--urgencia-vencida-text)', border: 'var(--urgencia-vencida-border)', label: 'Vencida' }
  if (dias <= 2)
    return { bg: 'var(--urgencia-urgente-bg)', text: 'var(--urgencia-urgente-text)', border: 'var(--urgencia-urgente-border)', label: `${dias}d` }
  if (dias <= 7)
    return { bg: 'var(--urgencia-atencao-bg)', text: 'var(--urgencia-atencao-text)', border: 'var(--urgencia-atencao-border)', label: `${dias}d` }
  return { bg: 'var(--urgencia-normal-bg)', text: 'var(--urgencia-normal-text)', border: 'var(--urgencia-normal-border)', label: `${dias}d` }
}

type Form = {
  processoId: string
  tipo: string
  dataLimite: string
  responsavel: string
  observacao: string
}
const FORM_VAZIO: Form = { processoId: '', tipo: '', dataLimite: '', responsavel: '', observacao: '' }

export default function PendenciasPage() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [cumprindo, setCumprindo] = useState<string | null>(null)
  const toast = useToast()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setPendencias(await getPendencias())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function setField<K extends keyof Form>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await criarPendencia({
        processoId: form.processoId,
        tipo: form.tipo,
        dataLimite: form.dataLimite || null,
        responsavel: form.responsavel || null,
        observacao: form.observacao || null,
      })
      toast.success('Pendência criada.')
      setShowForm(false)
      setForm(FORM_VAZIO)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCumprir(id: string) {
    setCumprindo(id)
    try {
      await cumprirPendencia(id)
      toast.success('Pendência cumprida.')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCumprindo(null)
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Pendências</h1>
        <button
          onClick={() => { setShowForm(true); setForm(FORM_VAZIO) }}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Nova pendência
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCriar} className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Nova pendência</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">ID do processo</label>
              <input required value={form.processoId} onChange={e => setField('processoId', e.target.value)}
                placeholder="UUID do processo"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm font-mono focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Tipo</label>
              <input required value={form.tipo} onChange={e => setField('tipo', e.target.value)}
                placeholder="Ex: MANIFESTAR, PETICIONAR..."
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Data limite</label>
              <input type="date" value={form.dataLimite} onChange={e => setField('dataLimite', e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Responsável</label>
              <input value={form.responsavel} onChange={e => setField('responsavel', e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Observação</label>
              <input value={form.observacao} onChange={e => setField('observacao', e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50">
              {saving ? 'Salvando…' : 'Criar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-4 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />)}</div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error} <button onClick={load} className="underline">Tentar novamente</button>
        </div>
      ) : pendencias.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhuma pendência aberta.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {['Prazo', 'Processo', 'Tipo', 'Responsável', 'Status', ''].map(col => (
                  <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {pendencias.map(p => {
                const urg = urgencia(p.dataLimite)
                return (
                  <tr key={p.id} className="hover:bg-[var(--color-bg-hover)]">
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: urg.bg, color: urg.text, border: `1px solid ${urg.border}` }}>
                        {p.dataLimite ? `${urg.label} · ${p.dataLimite.slice(5).replace('-', '/')}` : 'Sem prazo'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-[var(--color-text-primary)]">
                        {p.processo?.numero ?? p.processoId.slice(0, 8) + '…'}
                      </span>
                      {p.processo?.clienteNome && (
                        <p className="text-xs text-[var(--color-text-secondary)]">{p.processo.clienteNome}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{p.tipo}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{p.responsavel ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-[var(--urgencia-normal-bg)] px-2 py-0.5 text-xs text-[var(--urgencia-normal-text)]">{p.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => handleCumprir(p.id)} disabled={cumprindo === p.id}
                        className="text-xs text-[var(--color-brand)] hover:underline disabled:opacity-50">
                        {cumprindo === p.id ? 'Cumprindo…' : 'Cumprir'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
