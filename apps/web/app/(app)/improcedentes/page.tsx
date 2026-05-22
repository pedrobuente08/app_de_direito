'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getAuthMe,
  getImprocedentes,
  getImprocedentesResumo,
  patchImprocedente,
  solicitarCertidaoCredito,
} from '@/lib/api'
import { KpiCard } from '@/components/ui/kpi-card'
import type { ImprocedenteRow, ImprocedentesResumo } from '@/lib/types'
import { ToastContainer, useToast } from '@/lib/toast'

const STATUS_OPCOES = ['A_PAGAR', 'PAGO', 'SUSPENSO'] as const

export default function ImprocedentesPage() {
  const toast = useToast()
  const [readOnly, setReadOnly] = useState(false)
  const [rows, setRows] = useState<ImprocedenteRow[]>([])
  const [resumo, setResumo] = useState<ImprocedentesResumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    valorSucumbencia: '',
    destinatarioSucumbencia: '',
    statusPagamento: 'A_PAGAR',
    dataPrazoPagamento: '',
    dataPagamento: '',
    justicaGratuita: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, r] = await Promise.all([
        getImprocedentes(),
        getImprocedentesResumo(),
      ])
      setRows(list)
      setResumo(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getAuthMe()
      .then((me) => setReadOnly(me.perfil === 'leitura'))
      .catch(() => setReadOnly(false))
    void load()
  }, [load])

  function openEdit(row: ImprocedenteRow) {
    setEditId(row.id)
    setForm({
      valorSucumbencia: row.valorSucumbencia ?? '',
      destinatarioSucumbencia: row.destinatarioSucumbencia ?? '',
      statusPagamento: row.statusPagamento ?? 'A_PAGAR',
      dataPrazoPagamento: row.dataPrazoPagamento ?? '',
      dataPagamento: row.dataPagamento ?? '',
      justicaGratuita: !!row.justicaGratuita,
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setSaving(true)
    try {
      await patchImprocedente(editId, {
        valorSucumbencia: form.valorSucumbencia.trim() || null,
        destinatarioSucumbencia: form.destinatarioSucumbencia.trim() || null,
        statusPagamento: form.statusPagamento,
        dataPrazoPagamento: form.dataPrazoPagamento.trim() || null,
        dataPagamento: form.dataPagamento.trim() || null,
        justicaGratuita: form.justicaGratuita,
      })
      toast.success('Sucumbência atualizada.')
      setEditId(null)
      void load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const cards = [
    { label: 'Total improc.', value: resumo?.total ?? '—', variant: 'default' as const },
    { label: 'Em avaliação', value: resumo?.emAvaliacao ?? '—', variant: 'warning' as const },
    { label: 'Sucumb. a pagar', value: resumo?.sucumbenciaAPagar ?? '—', variant: 'danger' as const },
    { label: 'Vence em 15d', value: resumo?.venceEm15 ?? '—', variant: 'warning' as const },
    { label: 'Passivo (R$)', value: resumo?.passivoTotal ?? '—', variant: 'accent' as const },
  ]

  return (
    <div className="animate-fade-in-up space-y-4">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Improcedentes
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Gestão de sucumbência e processos com decisão pós-sentença improcedente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <KpiCard key={c.label} label={c.label} value={c.value} variant={c.variant} />
        ))}
      </div>

      {error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Nenhum registro de improcedente.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {[
                  'Processo',
                  'Cliente',
                  'Decisão',
                  'Valor',
                  'Status',
                  'Prazo pag.',
                  'JG',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--color-text-secondary)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {rows.map((r) => {
                const av = r.avaliacaoRecurso as { ativa?: boolean } | null
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-mono text-xs">{r.numero ?? '—'}</td>
                    <td className="px-3 py-2">{r.clienteNome ?? '—'}</td>
                    <td className="px-3 py-2">
                      {av?.ativa ? (
                        <span
                          className="rounded-full bg-[var(--urgencia-atencao-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--urgencia-atencao-text)]"
                          title={
                            (av as { prazo?: string }).prazo
                              ? `Prazo: ${(av as { prazo?: string }).prazo}`
                              : 'Em avaliação de recurso'
                          }
                        >
                          AVALIAR
                        </span>
                      ) : (
                        r.decisaoRecurso ?? '—'
                      )}
                    </td>
                    <td className="px-3 py-2">{r.valorSucumbencia ?? '—'}</td>
                    <td className="px-3 py-2">{r.statusPagamento}</td>
                    <td className="px-3 py-2">{r.dataPrazoPagamento ?? '—'}</td>
                    <td className="px-3 py-2">{r.justicaGratuita ? 'Sim' : 'Não'}</td>
                    <td className="px-3 py-2 text-right">
                      {!readOnly ? (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="text-xs text-[var(--color-brand)] hover:underline"
                          >
                            Editar
                          </button>
                          {r.litiganciaMaFe &&
                          !av?.ativa &&
                          r.decisaoRecurso !== 'RECORRER' &&
                          !r.certidaoCreditoSolicitada ? (
                            <button
                              type="button"
                              className="text-xs text-[var(--color-text-secondary)] hover:underline"
                              onClick={async () => {
                                try {
                                  await solicitarCertidaoCredito(r.id)
                                  toast.success('Certidão de crédito solicitada.')
                                  void load()
                                } catch (e) {
                                  toast.error((e as Error).message)
                                }
                              }}
                            >
                              Certidão de crédito
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editId ? (
        <form
          onSubmit={handleSave}
          className="max-w-md space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4"
        >
          <h2 className="text-sm font-semibold">Editar sucumbência</h2>
          <label className="block text-xs">
            Valor
            <input
              value={form.valorSucumbencia}
              onChange={(e) =>
                setForm((f) => ({ ...f, valorSucumbencia: e.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs">
            Destinatário
            <input
              value={form.destinatarioSucumbencia}
              onChange={(e) =>
                setForm((f) => ({ ...f, destinatarioSucumbencia: e.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs">
            Status pagamento
            <select
              value={form.statusPagamento}
              onChange={(e) =>
                setForm((f) => ({ ...f, statusPagamento: e.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            Prazo pagamento
            <input
              type="date"
              value={form.dataPrazoPagamento}
              onChange={(e) =>
                setForm((f) => ({ ...f, dataPrazoPagamento: e.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="block text-xs">
            Data pagamento
            <input
              type="date"
              value={form.dataPagamento}
              onChange={(e) =>
                setForm((f) => ({ ...f, dataPagamento: e.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.justicaGratuita}
              onChange={(e) =>
                setForm((f) => ({ ...f, justicaGratuita: e.target.checked }))
              }
            />
            Justiça gratuita (suspende alerta de pagamento)
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setEditId(null)} className="text-sm underline">
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
