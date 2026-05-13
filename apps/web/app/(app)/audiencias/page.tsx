'use client'

import React, { useEffect, useState } from 'react'
import { criarAudiencia, finalizarAudiencia, getAudiencias } from '@/lib/api'
import { ToastContainer, useToast } from '@/lib/toast'
import type { Audiencia } from '@/lib/types'

const STATUS_CLASS: Record<string, string> = {
  AGENDADA: 'bg-[var(--aud-agendada-bg)] text-[var(--aud-agendada-text)]',
  REALIZADA: 'bg-[var(--aud-realizada-bg)] text-[var(--aud-realizada-text)]',
  CANCELADA: 'bg-[var(--aud-cancelada-bg)] text-[var(--aud-cancelada-text)]',
  REDESIGNADA: 'bg-[var(--aud-redesignada-bg)] text-[var(--aud-redesignada-text)]',
}

type CriarForm = { processoId: string; data: string; tipo: string; hora: string; pautista: string; link: string; obsPre: string }
const CRIAR_VAZIO: CriarForm = { processoId: '', data: '', tipo: '', hora: '', pautista: '', link: '', obsPre: '' }

type FinalizarForm = { obsPos: string; status: string; autorPresenca: string; motivoAusencia: string }
const FINALIZAR_VAZIO: FinalizarForm = { obsPos: '', status: 'REALIZADA', autorPresenca: 'PRESENTE', motivoAusencia: '' }

const STATUS_FINALIZAR = ['REALIZADA', 'CANCELADA', 'ADIADA', 'REDESIGNADA']

export default function AudienciasPage() {
  const [audiencias, setAudiencias] = useState<Audiencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCriar, setShowCriar] = useState(false)
  const [criarForm, setCriarForm] = useState<CriarForm>(CRIAR_VAZIO)
  const [saving, setSaving] = useState(false)
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null)
  const [finalizarForm, setFinalizarForm] = useState<FinalizarForm>(FINALIZAR_VAZIO)
  const [submittingFinalizar, setSubmittingFinalizar] = useState(false)
  const toast = useToast()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setAudiencias(await getAudiencias())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function setCriarField<K extends keyof CriarForm>(k: K, v: string) {
    setCriarForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await criarAudiencia({
        processoId: criarForm.processoId,
        data: criarForm.data,
        tipo: criarForm.tipo || null,
        hora: criarForm.hora || null,
        pautista: criarForm.pautista || null,
        link: criarForm.link || null,
        obsPre: criarForm.obsPre || null,
      })
      toast.success('Audiência criada.')
      setShowCriar(false)
      setCriarForm(CRIAR_VAZIO)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleFinalizar(e: React.FormEvent) {
    e.preventDefault()
    if (!finalizandoId) return
    setSubmittingFinalizar(true)
    try {
      const body: {
        obsPos: string
        status?: string
        autorPresenca?: string
        motivoAusencia?: string
      } = { obsPos: finalizarForm.obsPos, status: finalizarForm.status }
      if (finalizarForm.status === 'REALIZADA') {
        body.autorPresenca = finalizarForm.autorPresenca
        if (finalizarForm.autorPresenca === 'AUSENTE') {
          body.motivoAusencia = finalizarForm.motivoAusencia
        }
      }
      await finalizarAudiencia(finalizandoId, body)
      toast.success('Audiência finalizada.')
      setFinalizandoId(null)
      setFinalizarForm(FINALIZAR_VAZIO)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmittingFinalizar(false)
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Audiências</h1>
        <button onClick={() => { setShowCriar(true); setCriarForm(CRIAR_VAZIO) }}
          className="rounded-[var(--radius-md)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]">
          Nova audiência
        </button>
      </div>

      {showCriar && (
        <form onSubmit={handleCriar} className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Nova audiência</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">ID do processo</label>
              <input required value={criarForm.processoId} onChange={e => setCriarField('processoId', e.target.value)}
                placeholder="UUID do processo"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm font-mono focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Data</label>
              <input required type="date" value={criarForm.data} onChange={e => setCriarField('data', e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Hora</label>
              <input type="time" value={criarForm.hora} onChange={e => setCriarField('hora', e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Tipo</label>
              <input value={criarForm.tipo} onChange={e => setCriarField('tipo', e.target.value)}
                placeholder="ORDINÁRIA, VIRTUAL…"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Pautista</label>
              <input value={criarForm.pautista} onChange={e => setCriarField('pautista', e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Link (videoconferência)</label>
              <input type="url" value={criarForm.link} onChange={e => setCriarField('link', e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50">
              {saving ? 'Salvando…' : 'Criar'}
            </button>
            <button type="button" onClick={() => setShowCriar(false)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-4 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]" />)}</div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error} <button onClick={load} className="underline">Tentar novamente</button>
        </div>
      ) : audiencias.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhuma audiência cadastrada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {['Data', 'Processo', 'Tipo', 'Pautista', 'Status', ''].map(col => (
                  <th key={col} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {audiencias.map(a => (
                <React.Fragment key={a.id}>
                  <tr className="hover:bg-[var(--color-bg-hover)]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-primary)]">
                      {a.data.slice(8, 10)}/{a.data.slice(5, 7)}/{a.data.slice(0, 4)}
                      {a.hora && <span className="ml-1 text-[var(--color-text-secondary)]">{a.hora}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-[var(--color-text-primary)]">
                        {a.processo?.numero ?? a.processoId.slice(0, 8) + '…'}
                      </span>
                      {a.processo?.clienteNome && (
                        <p className="text-xs text-[var(--color-text-secondary)]">{a.processo.clienteNome}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{a.tipo ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{a.pautista ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[a.status] ?? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {a.status === 'AGENDADA' && (
                        <button onClick={() => { setFinalizandoId(a.id); setFinalizarForm(FINALIZAR_VAZIO) }}
                          className="text-xs text-[var(--color-brand)] hover:underline">
                          Finalizar
                        </button>
                      )}
                    </td>
                  </tr>

                  {finalizandoId === a.id && (
                    <tr key={`${a.id}-finalizar`}>
                      <td colSpan={6} className="bg-[var(--color-bg-subtle)] px-4 py-3">
                        <form onSubmit={handleFinalizar} className="flex flex-wrap items-end gap-3">
                          <div className="flex-1 min-w-48">
                            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Observações pós-audiência</label>
                            <textarea required rows={2} value={finalizarForm.obsPos}
                              onChange={e => setFinalizarForm(prev => ({ ...prev, obsPos: e.target.value }))}
                              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
                          </div>
                          {finalizarForm.status === 'REALIZADA' && (
                            <>
                              <div>
                                <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Autor</label>
                                <select value={finalizarForm.autorPresenca} onChange={e => setFinalizarForm(prev => ({ ...prev, autorPresenca: e.target.value }))}
                                  className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none">
                                  <option value="PRESENTE">Presente</option>
                                  <option value="AUSENTE">Ausente</option>
                                </select>
                              </div>
                              {finalizarForm.autorPresenca === 'AUSENTE' && (
                                <div className="min-w-48 flex-1">
                                  <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Motivo da ausência</label>
                                  <input required value={finalizarForm.motivoAusencia} onChange={e => setFinalizarForm(prev => ({ ...prev, motivoAusencia: e.target.value }))}
                                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none" />
                                </div>
                              )}
                            </>
                          )}
                          <div>
                            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Resultado</label>
                            <select value={finalizarForm.status} onChange={e => setFinalizarForm(prev => ({ ...prev, status: e.target.value }))}
                              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none">
                              {STATUS_FINALIZAR.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <button type="submit" disabled={submittingFinalizar}
                            className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50">
                            {submittingFinalizar ? 'Salvando…' : 'Confirmar'}
                          </button>
                          <button type="button" onClick={() => setFinalizandoId(null)}
                            className="text-sm text-[var(--color-text-secondary)] hover:underline">
                            Cancelar
                          </button>
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
