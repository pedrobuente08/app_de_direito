'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import {
  atualizarObrigacaoFazer,
  atualizarProcedente,
  getAuthMe,
  getProcedentes,
  getProcedentesResumo,
  sincronizarProcedentesEmFalta,
} from '@/lib/api'
import { FamiliaTabs } from '@/components/ui/familia-tabs'
import { KpiCard } from '@/components/ui/kpi-card'
import type { Procedente, ProcedentesResumo } from '@/lib/types'
import { ToastContainer, useToast } from '@/lib/toast'

const FAMILIAS = [
  { value: 'AGUARDAR_TRANSITO', label: 'Aguardar trânsito', bg: 'var(--familia-aguardar-transito-bg)', text: 'var(--familia-aguardar-transito-text)' },
  { value: 'PEND_INTERNA', label: 'Pend. interna', bg: 'var(--familia-pend-interna-bg)', text: 'var(--familia-pend-interna-text)' },
  { value: 'EXEC_ATIVA', label: 'Exec. ativa', bg: 'var(--familia-exec-ativa-bg)', text: 'var(--familia-exec-ativa-text)' },
  { value: 'AGUARDAR_PAGTO', label: 'Aguardar pagto.', bg: 'var(--familia-aguardar-pagto-bg)', text: 'var(--familia-aguardar-pagto-text)' },
  { value: 'ENCERRADO', label: 'Encerrado', bg: 'var(--familia-encerrado-bg)', text: 'var(--familia-encerrado-text)' },
]

function FamiliaBadge({ value }: { value?: string | null }) {
  const f = FAMILIAS.find(f => f.value === value)
  if (!f) return <span className="text-xs text-[var(--color-text-secondary)]">—</span>
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: f.bg, color: f.text }}>
      {f.label}
    </span>
  )
}

type EditForm = {
  familiaSituacao: string
  situacao: string
  responsavel: string
  obsCurta: string
  valorRecebido: string
  dataRecebimento: string
  obrigacaoDescricao: string
  obrigacaoCumprida: boolean
  obrigacaoCumpridaEm: string
  serasajudAcionado: boolean
  temObrigacaoFazer: boolean
}

function formFromProcedente(p: Procedente): EditForm {
  return {
    familiaSituacao: p.familiaSituacao ?? '',
    situacao: p.situacao ?? '',
    responsavel: p.responsavel ?? '',
    obsCurta: p.obsCurta ?? '',
    valorRecebido: p.valorRecebido ?? '',
    dataRecebimento: p.dataRecebimento ?? '',
    obrigacaoDescricao: p.obrigacaoFazerDescricao ?? '',
    obrigacaoCumprida: !!p.obrigacaoFazerCumprida,
    obrigacaoCumpridaEm: p.obrigacaoFazerCumpridaEm ?? '',
    serasajudAcionado: !!p.serasajudAcionado,
    temObrigacaoFazer: !!p.temObrigacaoFazer,
  }
}

export default function ProcedentesPage() {
  const [procedentes, setProcedentes] = useState<Procedente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    familiaSituacao: '',
    situacao: '',
    responsavel: '',
    obsCurta: '',
    valorRecebido: '',
    dataRecebimento: '',
    obrigacaoDescricao: '',
    obrigacaoCumprida: false,
    obrigacaoCumpridaEm: '',
    serasajudAcionado: false,
    temObrigacaoFazer: false,
  })
  const [saving, setSaving] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [resumo, setResumo] = useState<ProcedentesResumo | null>(null)
  const [filtroFamilia, setFiltroFamilia] = useState('')
  const toast = useToast()

  useEffect(() => {
    getAuthMe()
      .then((me) => setReadOnly(me.perfil === 'leitura'))
      .catch(() => setReadOnly(false))
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setProcedentes(await getProcedentes())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    getProcedentesResumo().then(setResumo).catch(() => setResumo(null))
  }, [])

  const listaFiltrada = filtroFamilia
    ? procedentes.filter((p) => p.familiaSituacao === filtroFamilia)
    : procedentes

  function startEdit(p: Procedente) {
    setEditandoId(p.processoId)
    setEditForm(formFromProcedente(p))
  }

  async function handleSincronizarFalta() {
    setSyncing(true)
    try {
      const { criadas } = await sincronizarProcedentesEmFalta()
      if (criadas === 0) {
        toast.success('Nenhuma linha em falta — funil já está alinhado.')
      } else {
        toast.success(`${criadas} linha(s) do funil criada(s).`)
      }
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  async function handleSalvar(e: React.FormEvent, processoId: string) {
    e.preventDefault()
    setSaving(true)
    try {
      await atualizarProcedente(processoId, {
        familiaSituacao: editForm.familiaSituacao || undefined,
        situacao: editForm.situacao || undefined,
        responsavel: editForm.responsavel || null,
        obsCurta: editForm.obsCurta || null,
        valorRecebido: editForm.valorRecebido || null,
        dataRecebimento: editForm.dataRecebimento || null,
      })
      toast.success('Procedente atualizado.')
      setEditandoId(null)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Procedentes</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Novos itens entram quando o processo tem sentença{' '}
            <strong className="font-medium text-[var(--color-text-primary)]">Procedente</strong>,{' '}
            <strong className="font-medium text-[var(--color-text-primary)]">Parcial</strong> ou{' '}
            <strong className="font-medium text-[var(--color-text-primary)]">Acordo</strong> — altere em{' '}
            <Link href="/intimacoes" className="text-[var(--color-brand)] hover:underline">
              Intimações
            </Link>
            . Use o botão ao lado só se já existir sentença assim e faltar a linha do funil (importação ou migração).
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            disabled={syncing || loading}
            onClick={handleSincronizarFalta}
            className="shrink-0 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
          >
            {syncing ? 'Sincronizando…' : 'Gerar linhas em falta'}
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total ativos', value: resumo?.totalAtivos, fam: '', variant: 'default' as const },
          { label: 'Ação imediata', value: resumo?.acaoImediata, fam: 'PEND_INTERNA', variant: 'danger' as const },
          { label: 'Aguardando', value: resumo?.aguardando, fam: 'AGUARDAR_TRANSITO', variant: 'warning' as const },
          { label: 'Encerrado 30d', value: resumo?.encerrado30d, fam: 'ENCERRADO', variant: 'success' as const },
          { label: 'Sem visto 30d', value: resumo?.semVisto30d, fam: '', variant: 'warning' as const },
          { label: 'Alvará >60d', value: resumo?.alvara60d, fam: '', variant: 'danger' as const },
        ].map((c) => (
          <KpiCard
            key={c.label}
            label={c.label}
            value={c.value ?? '—'}
            variant={c.variant}
            onClick={() => setFiltroFamilia(c.fam)}
          />
        ))}
      </div>

      <FamiliaTabs
        tabs={[
          { id: '', label: 'Todas', count: procedentes.length },
          ...FAMILIAS.map((f) => ({
            id: f.value,
            label: f.label,
            count: procedentes.filter((p) => p.familiaSituacao === f.value).length,
          })),
        ]}
        activeId={filtroFamilia}
        onChange={setFiltroFamilia}
      />

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />)}</div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error} <button onClick={load} className="underline">Tentar novamente</button>
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          <p>Nenhum processo com sentença procedente / parcial / acordo.</p>
          <p className="mt-2">
            <Link href="/intimacoes" className="font-medium text-[var(--color-brand)] hover:underline">
              Abrir Intimações
            </Link>{' '}
            para ajustar a coluna Sentença.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {['Processo', 'Réu', 'Sentença', 'Família / situação', 'Responsável', 'Valor recebido', ''].map(col => (
                  <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {listaFiltrada.map(p => (
                <React.Fragment key={p.processoId}>
                  <tr className="hover:bg-[var(--color-bg-hover)]">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-[var(--color-text-primary)]">{p.processo?.numero ?? p.processoId.slice(0, 8) + '…'}</span>
                      {p.processo?.clienteNome && (
                        <p className="text-xs text-[var(--color-text-secondary)]">{p.processo.clienteNome}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)] max-w-[160px] truncate">
                      {p.processo?.reuTexto ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)] max-w-[160px] truncate">
                      {p.processo?.sentenca ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <FamiliaBadge value={p.familiaSituacao} />
                      {p.temObrigacaoFazer ? (
                        <span className="mt-1 inline-block rounded bg-[var(--familia-pend-interna-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--familia-pend-interna-text)]">
                          Obrigação de fazer
                        </span>
                      ) : null}
                      {p.situacao && <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{p.situacao}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">{p.responsavel ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
                      {p.valorRecebido ? `R$ ${p.valorRecebido}` : '—'}
                      {p.dataRecebimento && <p>{p.dataRecebimento.slice(8, 10)}/{p.dataRecebimento.slice(5, 7)}/{p.dataRecebimento.slice(0, 4)}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() =>
                            editandoId === p.processoId ? setEditandoId(null) : startEdit(p)
                          }
                          className="text-xs text-[var(--color-brand)] hover:underline"
                        >
                          {editandoId === p.processoId ? 'Fechar' : 'Editar'}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
                      )}
                    </td>
                  </tr>

                  {editandoId === p.processoId && (
                    <tr key={`${p.processoId}-edit`}>
                      <td colSpan={7} className="bg-[var(--color-bg-subtle)] px-4 py-3">
                        <form onSubmit={e => handleSalvar(e, p.processoId)} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Família</label>
                            <select value={editForm.familiaSituacao}
                              onChange={e => setEditForm(prev => ({ ...prev, familiaSituacao: e.target.value }))}
                              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none">
                              <option value="">— sem família —</option>
                              {FAMILIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Situação</label>
                            <input value={editForm.situacao}
                              onChange={e => setEditForm(prev => ({ ...prev, situacao: e.target.value }))}
                              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Responsável</label>
                            <input value={editForm.responsavel}
                              onChange={e => setEditForm(prev => ({ ...prev, responsavel: e.target.value }))}
                              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Obs. curta</label>
                            <input value={editForm.obsCurta}
                              onChange={e => setEditForm(prev => ({ ...prev, obsCurta: e.target.value }))}
                              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Valor recebido</label>
                            <input value={editForm.valorRecebido} placeholder="Ex: 1500.00"
                              onChange={e => setEditForm(prev => ({ ...prev, valorRecebido: e.target.value }))}
                              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Data recebimento</label>
                            <input type="date" value={editForm.dataRecebimento}
                              onChange={e => setEditForm(prev => ({ ...prev, dataRecebimento: e.target.value }))}
                              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
                          </div>
                          <div className="col-span-full rounded border border-dashed p-3">
                            <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                              Obrigação de fazer / SerasaJud
                            </p>
                            <label className="mb-2 flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editForm.temObrigacaoFazer}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    temObrigacaoFazer: e.target.checked,
                                  }))
                                }
                              />
                              Tem obrigação de fazer
                            </label>
                            {editForm.temObrigacaoFazer ? (
                              <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                  value={editForm.obrigacaoDescricao}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      obrigacaoDescricao: e.target.value,
                                    }))
                                  }
                                  placeholder="Descrição da obrigação"
                                  className="rounded border px-2 py-1.5 text-sm sm:col-span-2"
                                />
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={editForm.obrigacaoCumprida}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        obrigacaoCumprida: e.target.checked,
                                      }))
                                    }
                                  />
                                  Réu cumpriu
                                </label>
                                <input
                                  type="date"
                                  value={editForm.obrigacaoCumpridaEm}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      obrigacaoCumpridaEm: e.target.value,
                                    }))
                                  }
                                  className="rounded border px-2 py-1.5 text-sm"
                                />
                                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                                  <input
                                    type="checkbox"
                                    checked={editForm.serasajudAcionado}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        serasajudAcionado: e.target.checked,
                                      }))
                                    }
                                  />
                                  SerasaJud acionado
                                </label>
                                <button
                                  type="button"
                                  className="text-xs text-[var(--color-brand)] hover:underline sm:col-span-2"
                                  onClick={async () => {
                                    if (!editForm.obrigacaoDescricao.trim()) {
                                      toast.error('Informe a descrição.')
                                      return
                                    }
                                    try {
                                      await atualizarObrigacaoFazer(p.processoId, {
                                        descricao: editForm.obrigacaoDescricao,
                                        cumprida: editForm.obrigacaoCumprida,
                                        cumpridaEm: editForm.obrigacaoCumpridaEm || undefined,
                                        serasajudAcionado: editForm.serasajudAcionado,
                                        temObrigacaoFazer: true,
                                      })
                                      toast.success('Obrigação de fazer salva.')
                                      load()
                                    } catch (err) {
                                      toast.error((err as Error).message)
                                    }
                                  }}
                                >
                                  Salvar só obrigação de fazer
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="col-span-full flex gap-2 pt-1">
                            <button type="submit" disabled={saving}
                              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50">
                              {saving ? 'Salvando…' : 'Salvar'}
                            </button>
                            <button type="button" onClick={() => setEditandoId(null)}
                              className="text-sm text-[var(--color-text-secondary)] hover:underline">
                              Cancelar
                            </button>
                          </div>
                        </form>
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
