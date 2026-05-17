'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { finalizarAudiencia, getEscritoriosAdversarios } from '@/lib/api'
import type { Audiencia, EscritorioAdversario } from '@/lib/types'

export type PendenciaPosAudienciaInput = {
  tipo: string
  dataLimite: string
  responsavel: string
  observacao: string
}

export type FinalizarAudienciaPayload = {
  obsPos: string
  status: string
  autorPresenca?: string
  motivoAusencia?: string
  novaData?: string
  novaHora?: string | null
  houvePendencia?: boolean
  pendencias?: PendenciaPosAudienciaInput[]
  escritorioAdversarioId?: string | null
}

const STATUS_OPCOES = ['REALIZADA', 'REDESIGNADA', 'CANCELADA', 'ADIADA'] as const

const PENDENCIA_TIPOS_PADRAO = [
  'PROCURAÇÃO',
  'PROCURAÇÃO ALVARÁ',
  'HIPOSSUFICIÊNCIA',
  'DILIGÊNCIA',
  'CR',
  'CR PROCURAÇÃO',
] as const

type Props = {
  open: boolean
  audiencia: Audiencia | null
  readOnly?: boolean
  tiposPendencia?: string[]
  onClose: () => void
  onSuccess: () => void
}

function emptyPendencia(): PendenciaPosAudienciaInput {
  return { tipo: '', dataLimite: '', responsavel: '', observacao: '' }
}

export function PosAudienciaDialog({
  open,
  audiencia,
  readOnly,
  tiposPendencia,
  onClose,
  onSuccess,
}: Props) {
  const [obsPos, setObsPos] = useState('')
  const [status, setStatus] = useState<string>('REALIZADA')
  const [autorPresenca, setAutorPresenca] = useState('PRESENTE')
  const [motivoAusencia, setMotivoAusencia] = useState('')
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [houvePendencia, setHouvePendencia] = useState(false)
  const [pendencias, setPendencias] = useState<PendenciaPosAudienciaInput[]>([
    emptyPendencia(),
  ])
  const [escritorioAdvId, setEscritorioAdvId] = useState('')
  const [adversarios, setAdversarios] = useState<EscritorioAdversario[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const tipoOpts = useMemo(() => {
    const set = new Set<string>([...PENDENCIA_TIPOS_PADRAO, ...(tiposPendencia ?? [])])
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [tiposPendencia])

  useEffect(() => {
    if (!open) return
    setObsPos('')
    setStatus('REALIZADA')
    setAutorPresenca('PRESENTE')
    setMotivoAusencia('')
    setNovaData('')
    setNovaHora('')
    setHouvePendencia(false)
    setPendencias([emptyPendencia()])
    setEscritorioAdvId(audiencia?.escritorioAdversarioId ?? '')
    setErro(null)
    getEscritoriosAdversarios()
      .then(setAdversarios)
      .catch(() => setAdversarios([]))
  }, [open, audiencia?.escritorioAdversarioId])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !audiencia || typeof document === 'undefined') return null

  const precisaPresenca =
    status === 'REALIZADA' || status === 'REDESIGNADA'
  const precisaNovaData = status === 'REDESIGNADA'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const obs = obsPos.trim()
    if (!obs) {
      setErro('Observações da audiência são obrigatórias.')
      return
    }
    if (precisaPresenca && autorPresenca === 'AUSENTE' && !motivoAusencia.trim()) {
      setErro('Informe o motivo da ausência do autor.')
      return
    }
    if (precisaNovaData && !novaData.trim()) {
      setErro('Informe a nova data da audiência redesignada.')
      return
    }
    const pendenciasValidas = pendencias.filter((p) => p.tipo.trim())
    if (houvePendencia && pendenciasValidas.length === 0) {
      setErro('Adicione ao menos uma pendência ou marque "Não".')
      return
    }

    setSalvando(true)
    try {
      const body: FinalizarAudienciaPayload = {
        obsPos: obs,
        status,
        escritorioAdversarioId: escritorioAdvId.trim() || null,
      }
      if (precisaPresenca) {
        body.autorPresenca = autorPresenca
        if (autorPresenca === 'AUSENTE') {
          body.motivoAusencia = motivoAusencia.trim()
        }
      }
      if (precisaNovaData) {
        body.novaData = novaData.slice(0, 10)
        body.novaHora = novaHora.trim() || null
      }
      if (status === 'REALIZADA') {
        body.houvePendencia = houvePendencia
        if (houvePendencia) {
          body.pendencias = pendenciasValidas.map((p) => ({
            tipo: p.tipo.trim(),
            dataLimite: p.dataLimite.trim() || undefined,
            responsavel: p.responsavel.trim() || null,
            observacao: p.observacao.trim() || null,
          }))
        }
      }
      await finalizarAudiencia(audiencia.id, body)
      onSuccess()
      onClose()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[61] flex max-h-[min(90vh,40rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Pós-audiência
          </h2>
          <p className="mt-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
            {audiencia.processo?.numero ?? audiencia.processoId}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3"
        >
          {erro ? (
            <p className="mb-2 text-xs text-[var(--urgencia-vencida-text)]">{erro}</p>
          ) : null}

          <label className="mb-3 block text-xs text-[var(--color-text-secondary)]">
            Observações da audiência *
            <textarea
              required
              rows={3}
              disabled={readOnly || salvando}
              value={obsPos}
              onChange={(e) => setObsPos(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
            />
          </label>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-[var(--color-text-secondary)]">
              Resultado
              <select
                disabled={readOnly || salvando}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
              >
                {STATUS_OPCOES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            {precisaPresenca ? (
              <label className="text-xs text-[var(--color-text-secondary)]">
                Autor
                <select
                  disabled={readOnly || salvando}
                  value={autorPresenca}
                  onChange={(e) => setAutorPresenca(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                >
                  <option value="PRESENTE">Presente</option>
                  <option value="AUSENTE">Ausente</option>
                </select>
              </label>
            ) : null}
          </div>

          {precisaPresenca && autorPresenca === 'AUSENTE' ? (
            <label className="mb-3 block text-xs text-[var(--color-text-secondary)]">
              Motivo da ausência *
              <input
                required
                disabled={readOnly || salvando}
                value={motivoAusencia}
                onChange={(e) => setMotivoAusencia(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
              />
            </label>
          ) : null}

          {precisaNovaData ? (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-[var(--color-text-secondary)]">
                Nova data *
                <input
                  type="date"
                  required
                  disabled={readOnly || salvando}
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--color-text-secondary)]">
                Nova hora
                <input
                  type="time"
                  disabled={readOnly || salvando}
                  value={novaHora}
                  onChange={(e) => setNovaHora(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          ) : null}

          <label className="mb-3 block text-xs text-[var(--color-text-secondary)]">
            Escritório adversário
            <select
              disabled={readOnly || salvando}
              value={escritorioAdvId}
              onChange={(e) => setEscritorioAdvId(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            >
              <option value="">— Não informado —</option>
              {adversarios.map((a) => (
                <option key={a.id} value={a.id}>{a.nomeCanonico}</option>
              ))}
            </select>
          </label>

          {status === 'REALIZADA' ? (
            <fieldset className="mb-3 rounded border border-[var(--color-border-default)] p-3">
              <legend className="px-1 text-xs font-medium text-[var(--color-text-primary)]">
                Houve pendência?
              </legend>
              <div className="mb-2 flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="houvePend"
                    checked={!houvePendencia}
                    disabled={readOnly || salvando}
                    onChange={() => setHouvePendencia(false)}
                  />
                  Não
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="houvePend"
                    checked={houvePendencia}
                    disabled={readOnly || salvando}
                    onChange={() => setHouvePendencia(true)}
                  />
                  Sim
                </label>
              </div>
              {houvePendencia ? (
                <div className="space-y-2">
                  {pendencias.map((p, i) => (
                    <div
                      key={i}
                      className="grid gap-2 rounded bg-[var(--color-bg-subtle)] p-2"
                    >
                      <select
                        required
                        disabled={readOnly || salvando}
                        value={p.tipo}
                        onChange={(e) => {
                          const next = [...pendencias]
                          next[i] = { ...next[i]!, tipo: e.target.value }
                          setPendencias(next)
                        }}
                        className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                      >
                        <option value="">Tipo…</option>
                        {tipoOpts.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        placeholder="Prazo"
                        disabled={readOnly || salvando}
                        value={p.dataLimite}
                        onChange={(e) => {
                          const next = [...pendencias]
                          next[i] = { ...next[i]!, dataLimite: e.target.value }
                          setPendencias(next)
                        }}
                        className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="Responsável"
                        disabled={readOnly || salvando}
                        value={p.responsavel}
                        onChange={(e) => {
                          const next = [...pendencias]
                          next[i] = { ...next[i]!, responsavel: e.target.value }
                          setPendencias(next)
                        }}
                        className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                  {!readOnly ? (
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => setPendencias((prev) => [...prev, emptyPendencia()])}
                      className="text-xs font-medium text-[var(--color-brand)]"
                    >
                      + Adicionar pendência
                    </button>
                  ) : null}
                </div>
              ) : null}
            </fieldset>
          ) : null}

          <footer className="mt-auto flex gap-2 border-t border-[var(--color-border-default)] pt-3">
            <button
              type="submit"
              disabled={readOnly || salvando}
              className="rounded bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[var(--color-border-default)] px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </footer>
        </form>
      </div>
    </>,
    document.body,
  )
}
