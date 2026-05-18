'use client'

import { useEffect, useState } from 'react'
import { criarReu, deletarReu, editarReu, getReus } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Reu } from '@/lib/types'

type Form = { nomeCanonico: string; aliasesRaw: string; cnpj: string }
const FORM_VAZIO: Form = { nomeCanonico: '', aliasesRaw: '', cnpj: '' }

function parseAliases(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function ReusPage() {
  const [reus, setReus] = useState<Reu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const toast = useToast()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setReus(await getReus())
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

  function openEdit(r: Reu) {
    setEditingId(r.id)
    setForm({
      nomeCanonico: r.nomeCanonico,
      aliasesRaw: r.aliases.join(', '),
      cnpj: r.cnpj ?? '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const aliases = parseAliases(form.aliasesRaw)
      const cnpj = form.cnpj.trim() || null
      if (editingId) {
        await editarReu(editingId, { nomeCanonico: form.nomeCanonico, aliases, cnpj })
        toast.success('Réu atualizado.')
      } else {
        await criarReu({ nomeCanonico: form.nomeCanonico, aliases, cnpj })
        toast.success('Réu criado.')
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
    if (!confirm('Remover este réu? Processos vinculados perdem a referência.')) return
    setDeletingId(id)
    try {
      await deletarReu(id)
      toast.success('Réu removido.')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  const reusFiltrados = busca.trim()
    ? reus.filter(
        (r) =>
          r.nomeCanonico.toLowerCase().includes(busca.toLowerCase()) ||
          r.aliases.some((a) => a.toLowerCase().includes(busca.toLowerCase())) ||
          (r.cnpj ?? '').includes(busca),
      )
    : reus

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Réus</h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Cadastro canônico + aliases. O semáforo sugere merge quando a extração coincide ≥ 85%.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Novo réu
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4"
        >
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
            {editingId ? 'Editar réu' : 'Novo réu'}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Nome canônico
              </label>
              <input
                required
                value={form.nomeCanonico}
                onChange={(e) => setForm((p) => ({ ...p, nomeCanonico: e.target.value }))}
                placeholder="BANCO BRADESCO S/A"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm uppercase focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                CNPJ (opcional)
              </label>
              <input
                value={form.cnpj}
                onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm font-mono focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Aliases (separados por vírgula)
              </label>
              <input
                value={form.aliasesRaw}
                onChange={(e) => setForm((p) => ({ ...p, aliasesRaw: e.target.value }))}
                placeholder="BRADESCO, BANCO BRADESCO"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
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

      <div className="mb-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, alias ou CNPJ…"
          className="w-full max-w-sm rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
        />
      </div>

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
                {['Nome canônico', 'CNPJ', 'Aliases', ''].map((col) => (
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
              {reusFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]"
                  >
                    {busca ? 'Nenhum réu encontrado para esta busca.' : 'Nenhum réu cadastrado.'}
                  </td>
                </tr>
              ) : (
                reusFiltrados.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--color-bg-hover)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">
                      {r.nomeCanonico}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
                      {r.cnpj ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                      {r.aliases.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.aliases.map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-xs"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openEdit(r)}
                        className="mr-3 text-xs text-[var(--color-brand)] hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="text-xs text-[var(--urgencia-vencida-text)] hover:underline disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {reusFiltrados.length > 0 && (
            <div className="border-t border-[var(--color-border-default)] px-4 py-2 text-xs text-[var(--color-text-tertiary)]">
              {reusFiltrados.length} réu{reusFiltrados.length !== 1 ? 's' : ''}
              {busca && ` (de ${reus.length} total)`}
            </div>
          )}
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
