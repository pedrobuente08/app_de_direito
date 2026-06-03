'use client'

import { useEffect, useState } from 'react'
import { getAddonsStatus, sobrestarProcesso } from '@/lib/api'
import type { SobrestamentoMotivoCodigo } from '@/lib/types'
import { PopupFooterActions, PopupShell } from './popup-shell'

const MOTIVOS_PRO: { id: SobrestamentoMotivoCodigo; label: string }[] = [
  { id: 'IRDR_IAC_STJ', label: 'IRDR / IAC (STJ)' },
  { id: 'IRDR_IAC_TJBA', label: 'IRDR / IAC (TJBA)' },
  {
    id: 'ACORDO_EXTRAJUDICIAL_NEGOCIACAO',
    label: 'Acordo extrajudicial em negociação',
  },
  { id: 'PREJUDICIAL_EXTERNA', label: 'Prejudicial externa' },
  {
    id: 'INDEFERIMENTO_INICIAL_RECURSO',
    label: 'Indeferimento inicial / recurso',
  },
  { id: 'OUTRO', label: 'Outro' },
]

const MOTIVO_LABEL: Record<SobrestamentoMotivoCodigo, string> = Object.fromEntries(
  MOTIVOS_PRO.map((m) => [m.id, m.label]),
) as Record<SobrestamentoMotivoCodigo, string>

type Props = {
  open: boolean
  processoId: string
  processoNumero?: string | null
  onClose: () => void
  onSuccess: () => void
}

export function PopUpSobrestamento({
  open,
  processoId,
  processoNumero,
  onClose,
  onSuccess,
}: Props) {
  const [workflowsRaros, setWorkflowsRaros] = useState(false)
  const [motivoCodigo, setMotivoCodigo] =
    useState<SobrestamentoMotivoCodigo>('OUTRO')
  const [motivo, setMotivo] = useState('')
  const [temaAfetado, setTemaAfetado] = useState('')
  const [previsaoRetorno, setPrevisaoRetorno] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [desde, setDesde] = useState(() => new Date().toISOString().slice(0, 10))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMotivoCodigo('OUTRO')
    setMotivo('')
    setTemaAfetado('')
    setPrevisaoRetorno('')
    setObservacoes('')
    setDesde(new Date().toISOString().slice(0, 10))
    setErro(null)
    void getAddonsStatus()
      .then((s) => setWorkflowsRaros(!!s.addons.workflows_raros))
      .catch(() => setWorkflowsRaros(false))
  }, [open])

  const exigeTema =
    workflowsRaros &&
    (motivoCodigo === 'IRDR_IAC_STJ' || motivoCodigo === 'IRDR_IAC_TJBA')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const motivoTexto = workflowsRaros
      ? motivo.trim() || MOTIVO_LABEL[motivoCodigo]
      : motivo.trim()
    if (!motivoTexto) {
      setErro('Informe o motivo do sobrestamento.')
      return
    }
    if (exigeTema && !temaAfetado.trim()) {
      setErro('Informe o tema ou número do incidente.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await sobrestarProcesso(processoId, {
        motivo: motivoTexto,
        sobrestadoDesde: desde,
        ...(workflowsRaros
          ? {
              motivoCodigo,
              temaAfetado: temaAfetado.trim() || undefined,
              previsaoRetorno: previsaoRetorno || undefined,
              observacoes: observacoes.trim() || undefined,
            }
          : {}),
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <PopupShell
      open={open}
      title="Sobrestar processo"
      subtitle={processoNumero ?? processoId}
      onClose={onClose}
      footer={
        <PopupFooterActions formId="popup-sobrestamento" onCancel={onClose} loading={salvando} />
      }
    >
      <form id="popup-sobrestamento" onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs text-[var(--color-text-secondary)]">
          Pendências abertas serão movidas para problemas com status SOBRESTADO.
          {workflowsRaros
            ? ' Será criada pendência de revisão em 180 dias.'
            : null}
        </p>
        {erro ? <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p> : null}

        {workflowsRaros ? (
          <>
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Motivo *
              <select
                value={motivoCodigo}
                onChange={(e) =>
                  setMotivoCodigo(e.target.value as SobrestamentoMotivoCodigo)
                }
                className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
              >
                {MOTIVOS_PRO.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            {exigeTema ? (
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                Tema / nº do incidente *
                <input
                  value={temaAfetado}
                  onChange={(e) => setTemaAfetado(e.target.value)}
                  className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
                  placeholder="Ex: Tema 1234, IAC 5"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Previsão de retorno
              <input
                type="date"
                value={previsaoRetorno}
                onChange={(e) => setPrevisaoRetorno(e.target.value)}
                className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
              Observações
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
              />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1 text-xs">
            Motivo *
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm"
            />
          </label>
        )}

        {workflowsRaros ? (
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Detalhe do motivo (opcional)
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
              placeholder="Complemento ao motivo selecionado…"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-xs">
          Desde *
          <input
            type="date"
            required
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </label>
      </form>
    </PopupShell>
  )
}
