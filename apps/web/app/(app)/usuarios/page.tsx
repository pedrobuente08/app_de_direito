'use client'

import { useEffect, useState } from 'react'
import { criarUsuario, editarUsuario, getUsuarios } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Usuario } from '@/lib/types'

type Perfil = 'admin' | 'adm' | 'advogado' | 'leitura'

const PERFIS: Perfil[] = ['admin', 'adm', 'advogado', 'leitura']
const PERFIL_LABEL: Record<Perfil, string> = {
  admin: 'Admin',
  adm: 'Administrador',
  advogado: 'Advogado',
  leitura: 'Leitura',
}

type Form = { nome: string; email: string; perfil: Perfil; senha: string }
const FORM_VAZIO: Form = { nome: '', email: '', perfil: 'adm', senha: '' }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
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
      setUsuarios(await getUsuarios())
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

  function openEdit(u: Usuario) {
    setEditingId(u.id)
    setForm({ nome: u.nome, email: u.email, perfil: u.perfil, senha: '' })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  function setField<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        const payload: Partial<{ nome: string; email: string; perfil: string; senha: string }> = {
          nome: form.nome,
          email: form.email,
          perfil: form.perfil,
        }
        if (form.senha) payload.senha = form.senha
        await editarUsuario(editingId, payload)
        toast.success('Usuário atualizado.')
      } else {
        await criarUsuario({
          nome: form.nome,
          email: form.email,
          perfil: form.perfil,
          senha: form.senha,
        })
        toast.success('Usuário criado.')
      }
      closeForm()
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Usuários</h1>
        <button
          onClick={openCreate}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          Novo usuário
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4"
        >
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
            {editingId ? 'Editar usuário' : 'Novo usuário'}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Nome
              </label>
              <input
                required
                value={form.nome}
                onChange={(e) => setField('nome', e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                E-mail
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Perfil
              </label>
              <select
                value={form.perfil}
                onChange={(e) => setField('perfil', e.target.value as Perfil)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              >
                {PERFIS.map((p) => (
                  <option key={p} value={p}>
                    {PERFIL_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Senha{editingId ? ' (vazio = sem alteração)' : ''}
              </label>
              <input
                type="password"
                required={!editingId}
                value={form.senha}
                onChange={(e) => setField('senha', e.target.value)}
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
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
                {['Nome', 'E-mail', 'Perfil', 'Status', ''].map((col) => (
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
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--color-bg-hover)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">
                    {u.nome}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-[var(--color-brand-subtle)] px-2 py-0.5 text-xs text-[var(--color-brand-text)]">
                      {PERFIL_LABEL[u.perfil] ?? u.perfil}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.ativo
                          ? 'bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]'
                          : 'bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]'
                      }`}
                    >
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-xs text-[var(--color-brand)] hover:underline"
                    >
                      Editar
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
