'use client'

import { useCallback, useEffect, useState } from 'react'
import { criarUsuario, editarUsuario, getUsuarios } from '@/lib/api'
import type { Usuario } from '@/lib/types'

type Props = {
  toast: { success: (m: string) => void; error: (m: string) => void }
}

type Perfil = 'admin' | 'adm' | 'advogado' | 'pautista' | 'atendimento' | 'leitura'

const PERFIS: { id: Perfil; label: string }[] = [
  { id: 'admin',       label: 'Admin' },
  { id: 'adm',         label: 'Adm. Operacional' },
  { id: 'advogado',    label: 'Advogado' },
  { id: 'pautista',    label: 'Pautista (só Agenda + pós-audiência)' },
  { id: 'atendimento', label: 'Atendimento' },
  { id: 'leitura',     label: 'Leitura' },
]

const FORM_VAZIO = {
  nome: '',
  email: '',
  perfil: 'advogado' as Perfil,
  senha: '',
  aliasesRaw: '',
  ehPautista: false,
}

const inputCls =
  'w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none'
const labelCls = 'mb-1 block text-xs font-medium text-[var(--color-text-secondary)]'

export function UsuariosSection({ toast }: Props) {
  const [lista, setLista] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setLista(await getUsuarios())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  function abrirEdicao(u: Usuario) {
    setEditandoId(u.id)
    setForm({
      nome: u.nome ?? '',
      email: u.email,
      perfil: u.perfil as Perfil,
      senha: '',
      aliasesRaw: u.loginAliases.join(', '),
      ehPautista: u.ehPautista ?? u.perfil === 'pautista',
    })
  }

  function cancelar() {
    setEditandoId(null)
    setForm(FORM_VAZIO)
  }

  async function salvar() {
    if (!form.email.trim()) return toast.error('E-mail obrigatório.')
    if (!editandoId && form.senha.length < 8) return toast.error('Senha mínima: 8 caracteres.')
    setSalvando(true)
    const aliases = form.aliasesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    try {
      if (editandoId) {
        const payload: Parameters<typeof editarUsuario>[1] = {
          nome: form.nome.trim() || undefined,
          perfil: form.perfil,
          loginAliases: aliases,
          ehPautista:
            form.perfil === 'pautista' ? true : form.ehPautista,
        }
        if (form.senha.trim()) payload.senha = form.senha.trim()
        await editarUsuario(editandoId, payload)
        toast.success('Usuário atualizado.')
      } else {
        await criarUsuario({
          nome: form.nome.trim() || undefined,
          email: form.email.trim(),
          perfil: form.perfil,
          senha: form.senha,
          loginAliases: aliases,
          ehPautista:
            form.perfil === 'pautista' ? true : form.ehPautista,
        })
        toast.success('Usuário criado.')
      }
      cancelar()
      void load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(u: Usuario) {
    try {
      await editarUsuario(u.id, { ativo: !u.ativo })
      toast.success(u.ativo ? 'Usuário desativado.' : 'Usuário reativado.')
      void load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const ativos = lista.filter((u) => u.ativo)
  const inativos = lista.filter((u) => !u.ativo)

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
          {editandoId ? 'Editar usuário' : 'Novo usuário'}
        </h2>
        <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
          <strong>Pautista</strong> (perfil): só Agenda + pós-audiência. <strong>Advogado</strong> que
          também faz audiência: marque &quot;Também atua como pautista&quot; — mantém acesso completo e
          aparece no dropdown. O <strong>nome</strong> é usado na atribuição da Agenda.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>Nome</label>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome completo"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>E-mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@escritorio.com"
              disabled={!!editandoId}
              className={`${inputCls} ${editandoId ? 'cursor-not-allowed opacity-50' : ''}`}
            />
          </div>
          <div>
            <label className={labelCls}>Perfil *</label>
            <select
              value={form.perfil}
              onChange={(e) => {
                const perfil = e.target.value as Perfil
                setForm({
                  ...form,
                  perfil,
                  ehPautista: perfil === 'pautista' ? true : form.ehPautista,
                })
              }}
              className={inputCls}
            >
              {PERFIS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>
              Senha {editandoId ? '(deixe em branco para não alterar)' : '*'}
            </label>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              className={inputCls}
            />
          </div>
          {(form.perfil === 'advogado' ||
            form.perfil === 'admin' ||
            form.perfil === 'adm') && (
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
                <input
                  type="checkbox"
                  checked={form.ehPautista}
                  onChange={(e) =>
                    setForm({ ...form, ehPautista: e.target.checked })
                  }
                  className="rounded border-[var(--color-border-default)]"
                />
                Também atua como pautista
              </label>
            </div>
          )}
          {form.perfil === 'pautista' && (
            <p className="text-xs text-[var(--color-text-tertiary)] self-end pb-1">
              Perfil pautista: sempre disponível no dropdown.
            </p>
          )}
          <div className="sm:col-span-2 lg:col-span-2">
            <label className={labelCls}>
              Aliases de login{' '}
              <span className="font-normal text-[var(--color-text-tertiary)]">
                (separados por vírgula — logins usados nos sistemas do tribunal)
              </span>
            </label>
            <input
              value={form.aliasesRaw}
              onChange={(e) => setForm({ ...form, aliasesRaw: e.target.value })}
              placeholder="joao.silva, jsilva2024"
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-[var(--color-brand)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Criar usuário'}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={cancelar}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-4 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              Cancelar
            </button>
          )}
        </div>
      </section>

      {/* Lista de usuários ativos */}
      {loading ? (
        <p className="text-sm text-[var(--color-text-tertiary)]">Carregando…</p>
      ) : (
        <>
          <UsuarioTabela
            titulo={`Usuários ativos (${ativos.length})`}
            rows={ativos}
            editandoId={editandoId}
            onEditar={abrirEdicao}
            onToggleAtivo={toggleAtivo}
          />
          {inativos.length > 0 && (
            <UsuarioTabela
              titulo={`Usuários inativos (${inativos.length})`}
              rows={inativos}
              editandoId={editandoId}
              onEditar={abrirEdicao}
              onToggleAtivo={toggleAtivo}
              dimmed
            />
          )}
        </>
      )}
    </div>
  )
}

function perfilLabel(p: string): string {
  return PERFIS.find((x) => x.id === p)?.label ?? p
}

function UsuarioTabela({
  titulo,
  rows,
  editandoId,
  onEditar,
  onToggleAtivo,
  dimmed = false,
}: {
  titulo: string
  rows: Usuario[]
  editandoId: string | null
  onEditar: (u: Usuario) => void
  onToggleAtivo: (u: Usuario) => void
  dimmed?: boolean
}) {
  if (rows.length === 0) return null
  return (
    <section className={`rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] ${dimmed ? 'opacity-60' : ''}`}>
      <div className="border-b border-[var(--color-border-default)] px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {titulo}
        </h3>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--color-bg-muted)]">
          <tr>
            {['Nome', 'E-mail', 'Perfil', 'Pautista', 'Aliases', ''].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-default)]">
          {rows.map((u) => (
            <tr
              key={u.id}
              className={`${editandoId === u.id ? 'bg-[var(--color-accent-subtle)]' : 'hover:bg-[var(--color-bg-hover)]'}`}
            >
              <td className="px-3 py-2 font-medium">{u.nome ?? '—'}</td>
              <td className="px-3 py-2 text-[var(--color-text-secondary)]">{u.email}</td>
              <td className="px-3 py-2">
                <span className="rounded-full bg-[var(--color-brand-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand)]">
                  {perfilLabel(u.perfil)}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                {u.ehPautista || u.perfil === 'pautista' ? 'Sim' : '—'}
              </td>
              <td className="max-w-[200px] px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
                {u.loginAliases.length > 0 ? u.loginAliases.join(', ') : '—'}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onEditar(u)}
                  className="mr-3 text-xs text-[var(--color-brand)] hover:underline"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onToggleAtivo(u)}
                  className="text-xs text-[var(--color-text-tertiary)] hover:underline"
                >
                  {u.ativo ? 'Desativar' : 'Reativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
