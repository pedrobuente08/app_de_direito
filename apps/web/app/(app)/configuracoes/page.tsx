'use client'

import { useEffect, useState } from 'react'
import {
  criarReu,
  deletarReu,
  editarReu,
  getEscritorioConfig,
  getReus,
  salvarEscritorioConfig,
} from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Reu } from '@/lib/types'

// ─── helpers para mapa chave→valor ───────────────────────────────────────────

type Pair = { key: string; value: string }

function recordToPairs(r: Record<string, string>): Pair[] {
  return Object.entries(r).map(([key, value]) => ({ key, value }))
}

function pairsToRecord(pairs: Pair[]): Record<string, string> {
  return Object.fromEntries(
    pairs.filter((p) => p.key.trim()).map((p) => [p.key.trim(), p.value.trim()]),
  )
}

// ─── PairTable ────────────────────────────────────────────────────────────────

function PairTable({
  label,
  hint,
  keyLabel,
  valueLabel,
  pairs,
  onChange,
}: {
  label: string
  hint: string
  keyLabel: string
  valueLabel: string
  pairs: Pair[]
  onChange: (pairs: Pair[]) => void
}) {
  function updatePair(i: number, field: 'key' | 'value', val: string) {
    const next = [...pairs]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{hint}</p>
      </div>
      <div className="space-y-1.5">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          <span>{keyLabel}</span>
          <span>{valueLabel}</span>
          <span />
        </div>
        {pairs.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              value={p.key}
              onChange={(e) => updatePair(i, 'key', e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm font-mono focus:border-[var(--color-brand)] focus:outline-none"
              placeholder="chave"
            />
            <input
              value={p.value}
              onChange={(e) => updatePair(i, 'value', e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              placeholder="valor"
            />
            <button
              type="button"
              onClick={() => onChange(pairs.filter((_, idx) => idx !== i))}
              className="rounded-[var(--radius-sm)] px-2 text-[var(--color-text-tertiary)] hover:text-[var(--urgencia-vencida-text)]"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...pairs, { key: '', value: '' }])}
        className="mt-3 text-xs text-[var(--color-brand)] hover:underline"
      >
        + Adicionar linha
      </button>
    </section>
  )
}

// ─── ReusCrud ─────────────────────────────────────────────────────────────────

type ReuForm = { nomeCanonico: string; aliases: string }
const REU_FORM_VAZIO: ReuForm = { nomeCanonico: '', aliases: '' }

function aliasesToArray(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

function ReusCrud() {
  const [reus, setReus] = useState<Reu[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ReuForm>(REU_FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const toast = useToast()

  async function load() {
    try {
      setReus(await getReus())
    } catch {
      // silencioso — seção fica vazia
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(REU_FORM_VAZIO)
    setShowForm(true)
    setExpanded(true)
  }

  function openEdit(r: Reu) {
    setEditingId(r.id)
    setForm({ nomeCanonico: r.nomeCanonico, aliases: r.aliases.join(', ') })
    setShowForm(true)
    setExpanded(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        nomeCanonico: form.nomeCanonico.trim().toUpperCase(),
        aliases: aliasesToArray(form.aliases),
      }
      if (editingId) {
        await editarReu(editingId, payload)
        toast.success('Réu atualizado.')
      } else {
        await criarReu(payload)
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
    if (!confirm('Remover este réu?')) return
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

  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-bg-hover)]"
      >
        <div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            Réus canônicos
          </span>
          {!loading && (
            <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">
              {reus.length} cadastrado{reus.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[var(--color-text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border-default)] p-4">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={openCreate}
              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-hover)]"
            >
              Novo réu
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleSave}
              className="mb-4 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] p-3"
            >
              <p className="mb-3 text-xs font-semibold text-[var(--color-text-primary)]">
                {editingId ? 'Editar réu' : 'Novo réu'}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                    Nome canônico
                  </label>
                  <input
                    required
                    value={form.nomeCanonico}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, nomeCanonico: e.target.value }))
                    }
                    placeholder="BANCO BRADESCO S.A."
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                    Aliases (separados por vírgula)
                  </label>
                  <input
                    value={form.aliases}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, aliases: e.target.value }))
                    }
                    placeholder="BRADESCO, BCO BRADESCO"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {reus.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">
              Nenhum réu cadastrado.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-border-default)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-bg-muted)]">
                  <tr>
                    {['Nome canônico', 'Aliases', ''].map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-default)]">
                  {reus.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--color-bg-hover)]">
                      <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">
                        {r.nomeCanonico}
                      </td>
                      <td className="px-3 py-2">
                        {r.aliases.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {r.aliases.map((a) => (
                              <span
                                key={a}
                                className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-xs text-[var(--color-text-secondary)]"
                              >
                                {a}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [mapaComarcas, setMapaComarcas] = useState<Pair[]>([])
  const [loginMap, setLoginMap] = useState<Pair[]>([])
  const [materiasRaw, setMateriasRaw] = useState('')
  const [faseInicial, setFaseInicial] = useState('')
  const [situacaoInicial, setSituacaoInicial] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    async function load() {
      try {
        const cfg = await getEscritorioConfig()
        setMapaComarcas(recordToPairs(cfg.mapa_comarcas ?? {}))
        setLoginMap(recordToPairs(cfg.login_map ?? {}))
        setMateriasRaw((cfg.materias_validas ?? []).join('\n'))
        setFaseInicial(cfg.fase_inicial ?? '')
        setSituacaoInicial(cfg.situacao_inicial ?? '')
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await salvarEscritorioConfig({
        mapa_comarcas: pairsToRecord(mapaComarcas),
        login_map: pairsToRecord(loginMap),
        materias_validas: materiasRaw
          .split('\n')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        fase_inicial: faseInicial,
        situacao_inicial: situacaoInicial,
      })
      toast.success('Configurações salvas.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
        {error}
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Configurações do escritório
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Estes dados alimentam diretamente a skill de extração de PDF.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <PairTable
          label="Mapa de comarcas"
          hint="Código CNJ (4 dígitos) → abreviado usado pela skill"
          keyLabel="Código"
          valueLabel="Abreviado"
          pairs={mapaComarcas}
          onChange={setMapaComarcas}
        />

        <PairTable
          label="Mapa de logins"
          hint="Alias no nome do arquivo → nome canônico do advogado"
          keyLabel="Alias"
          valueLabel="Nome canônico"
          pairs={loginMap}
          onChange={setLoginMap}
        />

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Matérias válidas
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Uma por linha. A skill alerta quando extrai uma matéria fora desta lista.
            </p>
          </div>
          <textarea
            rows={6}
            value={materiasRaw}
            onChange={(e) => setMateriasRaw(e.target.value)}
            placeholder={'NEGATIVAÇÃO\nCONTA CANCELADA\nEMBASA'}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 font-mono text-sm focus:border-[var(--color-brand)] focus:outline-none"
          />
        </section>

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            Valores padrão da skill
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Fase inicial
              </label>
              <input
                value={faseInicial}
                onChange={(e) => setFaseInicial(e.target.value)}
                placeholder="AUDIÊNCIA AGENDADA"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
                Situação inicial
              </label>
              <input
                value={situacaoInicial}
                onChange={(e) => setSituacaoInicial(e.target.value)}
                placeholder="ATIVO"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </div>
      </form>

      {/* separador visual entre config e réus */}
      <div className="my-8 border-t border-[var(--color-border-default)]" />

      <ReusCrud />

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
