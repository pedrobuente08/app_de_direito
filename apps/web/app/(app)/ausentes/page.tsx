'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  atualizarAusente,
  getRelatorioAusentes6m,
  getResumoAusentes6m,
} from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { AudienciaAusente, Ausentes6mResumo } from '@/lib/types'

export default function Ausentes6mPage() {
  const [rows, setRows] = useState<AudienciaAusente[]>([])
  const [resumo, setResumo] = useState<Ausentes6mResumo | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum] = await Promise.all([
        getRelatorioAusentes6m(),
        getResumoAusentes6m(),
      ])
      setRows(list)
      setResumo(sum)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleReaproveitavel(row: AudienciaAusente) {
    try {
      await atualizarAusente(row.id, {
        reaproveitavel: !row.reaproveitavel,
      })
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function marcarReaproveitado(row: AudienciaAusente) {
    const hoje = new Date().toISOString().slice(0, 10)
    try {
      await atualizarAusente(row.id, { reaproveitadoEm: hoje })
      toast.success('Marcado como reaproveitado.')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="animate-fade-in-up max-w-5xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Autores ausentes — 6 meses</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Relatório semestral para reprotocolar leads. Marque candidatos e data de reaproveitamento.
        </p>
      </div>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-center">
            <p className="text-2xl font-bold">{resumo.total}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Total</p>
          </div>
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-center">
            <p className="text-2xl font-bold">{resumo.reaproveitaveis}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Marcados reprotocolar</p>
          </div>
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-center">
            <p className="text-2xl font-bold">{resumo.reaproveitados}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Reaproveitados</p>
          </div>
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-center">
            <p className="text-2xl font-bold">{resumo.pctReaproveitados}%</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Taxa reaproveitamento</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)] text-xs uppercase text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-3 py-2 text-left">Processo</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Data aud.</th>
                <th className="px-3 py-2 text-left">Motivo</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-mono text-xs">{r.numeroProcesso}</td>
                  <td className="px-3 py-2">{r.clienteNome ?? '—'}</td>
                  <td className="px-3 py-2">{r.dataAudiencia}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs" title={r.motivoAusencia}>
                    {r.motivoAusencia}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleReaproveitavel(r)}
                      className={`mr-2 rounded px-2 py-0.5 border ${
                        r.reaproveitavel
                          ? 'border-[var(--urgencia-normal-border)] bg-[var(--urgencia-normal-bg)]'
                          : 'border-[var(--color-border-default)]'
                      }`}
                    >
                      {r.reaproveitavel ? '✓ Reprotocolar' : 'Marcar'}
                    </button>
                    <button
                      type="button"
                      disabled={!!r.reaproveitadoEm}
                      onClick={() => marcarReaproveitado(r)}
                      className="text-[var(--color-brand)] hover:underline disabled:opacity-40"
                    >
                      {r.reaproveitadoEm ? `Reap. ${r.reaproveitadoEm}` : 'Reaproveitado'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[var(--color-text-tertiary)]">
        Também visível na{' '}
        <Link href="/agenda" className="text-[var(--color-brand)] hover:underline">
          Agenda
        </Link>
        .
      </p>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
