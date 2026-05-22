'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { finalizarAudiencia, getEscritoriosAdversarios } from '@/lib/api'
import type { Audiencia, EscritorioAdversario } from '@/lib/types'

export type PendenciaPosAudienciaInput = {
  tipo: string
  diasUteis: string
  dataLimite: string
  responsavel?: string | null
  observacao?: string | null
}

export type PendenciaPosAudienciaApi = {
  tipo: string
  dataLimite: string
  responsavel?: string | null
  observacao?: string | null
}

export type FinalizarAudienciaPayload = {
  obsPos: string
  status: string
  autorPresenca?: string
  motivoAusencia?: string
  novaData?: string
  novaHora?: string | null
  houvePendencia?: boolean
  pendencias?: PendenciaPosAudienciaApi[]
  escritorioAdversarioId?: string | null
  cenario?: string
  cenarioObservacao?: string | null
}

const STATUS_OPCOES = ['REALIZADA', 'REDESIGNADA'] as const

const CENARIO_OPCOES: { value: string; label: string }[] = [
  { value: 'TODOS_COMPARECERAM', label: 'Todos compareceram' },
  { value: 'REVELIA', label: 'Revelia (réu não compareceu)' },
  { value: 'SO_ADVOGADO', label: 'Só o advogado' },
  { value: 'UNA', label: 'UNA' },
  { value: 'FRACIONADA', label: 'Fracionada' },
  { value: 'DOCUMENTACAO_PENDENTE', label: 'Documentação pendente' },
]

const MOTIVOS_AUSENCIA = [
  { value: 'AUTOR_FALTOU', label: 'Autor faltou' },
  { value: 'REPRESENTANTE_FALTOU', label: 'Representante faltou' },
  { value: 'ENDERECO_INVALIDO', label: 'Endereço inválido' },
  { value: 'OUTRO', label: 'Outro' },
] as const

function addBusinessDays(fromIso: string, days: number): string {
  const d = new Date(`${fromIso}T12:00:00`)
  let rest = Math.max(1, days)
  while (rest > 0) {
    d.setDate(d.getDate() + 1)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) rest -= 1
  }
  return d.toISOString().slice(0, 10)
}

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
  return {
    tipo: '',
    diasUteis: '5',
    dataLimite: '',
    responsavel: 'ADV',
    observacao: '',
  }
}

export function PopUpPosAudiencia({
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
  const [motivoAusenciaCodigo, setMotivoAusenciaCodigo] = useState('AUTOR_FALTOU')
  const [motivoAusenciaOutro, setMotivoAusenciaOutro] = useState('')
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [houvePendencia, setHouvePendencia] = useState(false)
  const [pendencias, setPendencias] = useState<PendenciaPosAudienciaInput[]>([
    emptyPendencia(),
  ])
  const [escritorioAdvId, setEscritorioAdvId] = useState('')
  const [cenario, setCenario] = useState('')
  const [cenarioObservacao, setCenarioObservacao] = useState('')
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
    setMotivoAusenciaCodigo('AUTOR_FALTOU')
    setMotivoAusenciaOutro('')
    setNovaData('')
    setNovaHora('')
    setHouvePendencia(false)
    setPendencias([emptyPendencia()])
    setEscritorioAdvId(audiencia?.escritorioAdversarioId ?? '')
    setCenario('')
    setCenarioObservacao('')
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
    if (!audiencia) return
    setErro(null)
    const obs = obsPos.trim()
    if (obs.length < 10) {
      setErro('Observações devem ter no mínimo 10 caracteres.')
      return
    }
    if (precisaPresenca && autorPresenca === 'AUSENTE') {
      if (
        motivoAusenciaCodigo === 'OUTRO' &&
        !motivoAusenciaOutro.trim()
      ) {
        setErro('Descreva o motivo da ausência.')
        return
      }
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
    if (status === 'REALIZADA' && !cenario.trim()) {
      setErro('Selecione o cenário da audiência.')
      return
    }
    if (status === 'REALIZADA' && cenario === 'SO_ADVOGADO' && !cenarioObservacao.trim()) {
      setErro('Informe a justificativa (só o advogado compareceu).')
      return
    }
    if (
      status === 'REALIZADA' &&
      cenario === 'DOCUMENTACAO_PENDENTE' &&
      !cenarioObservacao.trim()
    ) {
      setErro('Informe o documento necessário.')
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
          const codigo = motivoAusenciaCodigo
          body.motivoAusencia =
            codigo === 'OUTRO'
              ? `OUTRO: ${motivoAusenciaOutro.trim()}`
              : codigo
        }
      }
      if (precisaNovaData) {
        body.novaData = novaData.slice(0, 10)
        body.novaHora = novaHora.trim() || null
      }
      if (status === 'REALIZADA') {
        body.cenario = cenario.trim()
        body.cenarioObservacao = cenarioObservacao.trim() || null
        body.houvePendencia = houvePendencia
        if (houvePendencia) {
          const hoje = new Date().toISOString().slice(0, 10)
          body.pendencias = pendenciasValidas.map((p) => {
            const dias = Number.parseInt(p.diasUteis, 10)
            const dataLimite =
              p.dataLimite.trim() ||
              (Number.isFinite(dias) && dias > 0
                ? addBusinessDays(hoje, dias)
                : '')
            return {
              tipo: p.tipo.trim(),
              dataLimite,
              responsavel: p.responsavel?.trim() || 'ADV',
              observacao: p.observacao?.trim() || null,
            }
          })
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

          <div className="mb-3 grid grid-cols-2 gap-2">
            {precisaPresenca ? (
              <label className="text-xs text-[var(--color-text-secondary)]">
                Autor presente? *
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
            <label className="text-xs text-[var(--color-text-secondary)]">
              Audiência *
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
          </div>

          {precisaPresenca && autorPresenca === 'AUSENTE' ? (
            <div className="mb-3 space-y-2">
              <label className="block text-xs text-[var(--color-text-secondary)]">
                Motivo da ausência *
                <select
                  required
                  disabled={readOnly || salvando}
                  value={motivoAusenciaCodigo}
                  onChange={(e) => setMotivoAusenciaCodigo(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                >
                  {MOTIVOS_AUSENCIA.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
              {motivoAusenciaCodigo === 'OUTRO' ? (
                <label className="block text-xs text-[var(--color-text-secondary)]">
                  Descreva *
                  <input
                    required
                    disabled={readOnly || salvando}
                    value={motivoAusenciaOutro}
                    onChange={(e) => setMotivoAusenciaOutro(e.target.value)}
                    className="mt-1 w-full rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                  />
                </label>
              ) : null}
            </div>
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

          {status === 'REALIZADA' ? (
            <fieldset className="mb-3 rounded border border-[var(--color-border-default)] p-3">
              <legend className="px-1 text-xs font-medium text-[var(--color-text-primary)]">
                Cenário da audiência *
              </legend>
              <div className="space-y-1.5">
                {CENARIO_OPCOES.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-text-primary)]"
                  >
                    <input
                      type="radio"
                      name="cenario-aud"
                      value={opt.value}
                      checked={cenario === opt.value}
                      disabled={readOnly || salvando}
                      onChange={() => setCenario(opt.value)}
                      className="mt-0.5"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              {cenario === 'SO_ADVOGADO' ? (
                <label className="mt-3 block text-xs text-[var(--color-text-secondary)]">
                  Justificativa *
                  <textarea
                    required
                    rows={2}
                    disabled={readOnly || salvando}
                    value={cenarioObservacao}
                    onChange={(e) => setCenarioObservacao(e.target.value)}
                    className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
                  />
                </label>
              ) : null}
              {cenario === 'DOCUMENTACAO_PENDENTE' ? (
                <label className="mt-3 block text-xs text-[var(--color-text-secondary)]">
                  Documento necessário *
                  <textarea
                    required
                    rows={2}
                    disabled={readOnly || salvando}
                    value={cenarioObservacao}
                    onChange={(e) => setCenarioObservacao(e.target.value)}
                    placeholder="Ex.: procuração atualizada, comprovante de residência…"
                    className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
                  />
                </label>
              ) : null}
            </fieldset>
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
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          placeholder="Dias úteis"
                          disabled={readOnly || salvando}
                          value={p.diasUteis}
                          onChange={(e) => {
                            const next = [...pendencias]
                            next[i] = { ...next[i]!, diasUteis: e.target.value }
                            setPendencias(next)
                          }}
                          className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                        />
                        <input
                          type="date"
                          title="Data limite (opcional)"
                          disabled={readOnly || salvando}
                          value={p.dataLimite}
                          onChange={(e) => {
                            const next = [...pendencias]
                            next[i] = { ...next[i]!, dataLimite: e.target.value }
                            setPendencias(next)
                          }}
                          className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                        />
                      </div>
                      <input
                        placeholder="Responsável"
                        disabled={readOnly || salvando}
                        value={p.responsavel ?? ''}
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

          <label className="mb-3 block text-xs text-[var(--color-text-secondary)]">
            Observações *
            <textarea
              required
              minLength={10}
              rows={3}
              disabled={readOnly || salvando}
              value={obsPos}
              onChange={(e) => setObsPos(e.target.value)}
              placeholder="Mínimo 10 caracteres"
              className="mt-1 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm"
            />
            <span className="mt-0.5 block text-[10px] text-[var(--color-text-secondary)]">
              {obsPos.trim().length}/10 caracteres
            </span>
          </label>

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

/** @deprecated Use `PopUpPosAudiencia`. */
export const PosAudienciaDialog = PopUpPosAudiencia
