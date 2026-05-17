'use client'

import { useEffect, useState } from 'react'
import { criarReu, deletarReu, editarReu, getReus } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Reu } from '@/lib/types'

type Form = { nomeCanonico: string; aliasesRaw: string; cnpj: string }
const FORM_VAZIO: Form = { nomeCanonico: '', aliasesRaw: '', cnpj: '' }

export default function ReusPage() {
  const [rows, setRows] = useState<Reu[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  async function load() {
    setLoading(true)
    try {
      setRows(await getReus())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openEdit(r: Reu) {
    setEditingId(r.id)
    setForm({
      nomeCanonico: r.nomeCanonico,
      aliasesRaw: (r.aliases ?? []).join('\n'),
      cnpj: r.cnpj ?? '',
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
    try {
      if (editingId) {
        await editarReu(editingId, {
          nomeCanonico: form.nomeCanonico.trim(),
          aliases,
          cnpj: form.cnpj.trim() || null,
        })
        toast.success('Réu atualizado.')
      } else {
        await criarReu({
          nomeCanonico: form.nomeCanonico.trim(),
          aliases,
        })
        toast.success('Réu criado.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in-up max-w-4xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Réus</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Cadastro canônico + aliases. O semáforo sugere merge quando a extração coincide ≥85%.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null)
            setForm(FORM_VAZIO)
            setShowForm(true)
          }}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white"
        >
          Novo réu
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-4 space-y-3 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4"
        >
          <input
            required
            placeholder="Nome canônico"
            value={form.nomeCanonico}
            onChange={(e) => setForm((f) => ({ ...f, nomeCanonico: e.target.value }))}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
          <textarea
            rows={3}
            placeholder="Aliases (um por linha)"
            value={form.aliasesRaw}
            onChange={(e) => setForm((f) => ({ ...f, aliasesRaw: e.target.value }))}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded bg-[var(--color-brand)] px-4 py-1.5 text-sm text-white">
              Salvar
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded border px-4 py-1.5 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm">Carregando…</p>
      ) : (
        <table className="w-full text-sm rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <thead className="bg-[var(--color-bg-muted)] text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Canônico</th>
              <th className="px-3 py-2 text-left">Aliases</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border-default)]">
                <td className="px-3 py-2">{r.nomeCanonico}</td>
                <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                  {(r.aliases ?? []).join(' · ')}
                </td>
                <td className="px-3 py-2 text-right text-xs">
                  <button type="button" onClick={() => openEdit(r)} className="mr-2 text-[var(--color-brand)]">
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Remover réu?')) return
                      await deletarReu(r.id)
                      load()
                    }}
                    className="text-[var(--urgencia-vencida-text)]"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
