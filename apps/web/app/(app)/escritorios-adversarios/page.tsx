'use client'

import { useEffect, useState } from 'react'
import {
  criarEscritorioAdversario,
  deletarEscritorioAdversario,
  editarEscritorioAdversario,
  getEscritoriosAdversarios,
} from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { EscritorioAdversario } from '@/lib/types'

type Form = { nomeCanonico: string; cnpj: string; aliasesRaw: string }
const FORM_VAZIO: Form = { nomeCanonico: '', cnpj: '', aliasesRaw: '' }

export default function EscritoriosAdversariosPage() {
  const [rows, setRows] = useState<EscritorioAdversario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await getEscritoriosAdversarios())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(FORM_VAZIO)
    setShowForm(true)
  }

  function openEdit(r: EscritorioAdversario) {
    setEditingId(r.id)
    setForm({
      nomeCanonico: r.nomeCanonico,
      cnpj: r.cnpj ?? '',
      aliasesRaw: (r.aliases ?? []).join('\n'),
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const aliases = form.aliasesRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const payload = {
      nomeCanonico: form.nomeCanonico.trim(),
      cnpj: form.cnpj.trim() || null,
      aliases,
    }
    try {
      if (editingId) {
        await editarEscritorioAdversario(editingId, payload)
        toast.success('Banca adversária atualizada.')
      } else {
        await criarEscritorioAdversario(payload)
        toast.success('Banca adversária criada.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta banca adversária?')) return
    try {
      await deletarEscritorioAdversario(id)
      toast.success('Removida.')
      load()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="animate-fade-in-up max-w-4xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Escritórios adversários
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Bancas do réu (canônico + aliases). Usado no semáforo de importação e pós-audiência.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Nova banca
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-5 space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4"
        >
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Nome canônico
            <input
              required
              value={form.nomeCanonico}
              onChange={(e) => setForm((f) => ({ ...f, nomeCanonico: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--color-text-secondary)]">
            CNPJ (opcional)
            <input
              value={form.cnpj}
              onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--color-text-secondary)]">
            Aliases (um por linha)
            <textarea
              rows={3}
              value={form.aliasesRaw}
              onChange={(e) => setForm((f) => ({ ...f, aliasesRaw: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-[var(--color-brand)] px-4 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded border px-4 py-1.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-[var(--urgencia-vencida-text)]">{error}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)] text-xs uppercase text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-3 py-2 text-left">Canônico</th>
                <th className="px-3 py-2 text-left">Aliases</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-medium">{r.nomeCanonico}</td>
                  <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                    {(r.aliases ?? []).join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <button type="button" onClick={() => openEdit(r)} className="mr-2 text-[var(--color-brand)]">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(r.id)} className="text-[var(--urgencia-vencida-text)]">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
