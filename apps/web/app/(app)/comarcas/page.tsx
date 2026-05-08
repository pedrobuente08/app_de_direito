'use client'

import { useEffect, useState } from 'react'
import { criarComarca, deletarComarca, editarComarca, getComarcas } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Comarca } from '@/lib/types'

type Form = { codigo: string; nome: string; abreviado: string }
const FORM_VAZIO: Form = { codigo: '', nome: '', abreviado: '' }

export default function ComarcasPage() {
  const [comarcas, setComarcas] = useState<Comarca[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const toast = useToast()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setComarcas(await getComarcas())
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

  function openEdit(c: Comarca) {
    setEditingId(c.id)
    setForm({ codigo: c.codigo, nome: c.nome, abreviado: c.abreviado })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  function setField<K extends keyof Form>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await editarComarca(editingId, form)
        toast.success('Comarca atualizada.')
      } else {
        await criarComarca(form)
        toast.success('Comarca criada.')
      }
      closeForm()
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta comarca?')) return
    setDeletingId(id)
    try {
      await deletarComarca(id)
      toast.success('Comarca removida.')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Comarcas</h1>
        <button
          onClick={openCreate}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Nova comarca
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4"
        >
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
            {editingId ? 'Editar comarca' : 'Nova comarca'}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Código CNJ (4 dígitos)
              </label>
              <input
                required
                maxLength={4}
                value={form.codigo}
                onChange={(e) => setField('codigo', e.target.value)}
                placeholder="0001"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm font-mono focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Nome completo
              </label>
              <input
                required
                value={form.nome}
                onChange={(e) => setField('nome', e.target.value)}
                placeholder="Salvador"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Abreviado (usado na skill)
              </label>
              <input
                required
                value={form.abreviado}
                onChange={(e) => setField('abreviado', e.target.value.toUpperCase())}
                placeholder="SSA"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm uppercase focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-4 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error}{' '}
          <button onClick={load} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {['Código', 'Nome', 'Abreviado', ''].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {comarcas.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--color-bg-hover)]">
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    {c.codigo}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">
                    {c.nome}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                    {c.abreviado}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="mr-3 text-xs text-[var(--color-brand)] hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="text-xs text-[var(--urgencia-vencida-text)] hover:underline disabled:opacity-50"
                    >
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
