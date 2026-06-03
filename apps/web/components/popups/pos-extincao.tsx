'use client'

import { useEffect, useState } from 'react'
import { aplicarPosExtincao, getAddonsStatus } from '@/lib/api'
import type { ExtincaoModalidadeLean, ExtincaoModalidadePro, Sentenca } from '@/lib/types'
import { Btn } from '@/components/ui/btn'
import { PopupFooterActions, PopupShell } from './popup-shell'

const MODALIDADES_LEAN: { id: ExtincaoModalidadeLean; label: string }[] = [
  { id: 'SEM_CUSTAS', label: 'Sem custas' },
  { id: 'COM_CUSTAS', label: 'Com custas' },
  { id: 'COM_MA_FE', label: 'Com má-fé' },
]

const MODALIDADES_PRO: { id: ExtincaoModalidadePro; label: string }[] = [
  { id: 'DESISTENCIA_SEM_ONUS', label: 'Desistência sem ônus (art. 485 VIII)' },
  { id: 'DESISTENCIA_COM_ONUS', label: 'Desistência com ônus (art. 90)' },
  { id: 'RENUNCIA_DIREITO', label: 'Renúncia ao direito — irreversível (art. 487 III-c)' },
]

const MOTIVOS = [
  'AUTOR_FALTOU',
  'INDEFERIMENTO_INICIAL',
  'AUS_PRESSUPOSTOS',
  'OUTRO',
] as const

type ModalidadeId = ExtincaoModalidadeLean | ExtincaoModalidadePro

type Props = {
  open: boolean
  processoId: string
  processoNumero?: string | null
  sentenca: Sentenca | null
  onClose: () => void
  onSuccess: () => void
}

export function PopUpPosExtincao({
  open,
  processoId,
  processoNumero,
  sentenca,
  onClose,
  onSuccess,
}: Props) {
  const [workflowsRaros, setWorkflowsRaros] = useState(false)
  const [modalidade, setModalidade] = useState<ModalidadeId>('SEM_CUSTAS')
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0])
  const [observacao, setObservacao] = useState('')
  const [confirmRenuncia, setConfirmRenuncia] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const opcoesModalidade = workflowsRaros
    ? [...MODALIDADES_PRO, ...MODALIDADES_LEAN]
    : MODALIDADES_LEAN

  const isRenuncia = modalidade === 'RENUNCIA_DIREITO'

  useEffect(() => {
    if (!open) return
    setModalidade('SEM_CUSTAS')
    setMotivo(MOTIVOS[0])
    setObservacao('')
    setConfirmRenuncia(false)
    setErro(null)
    void getAddonsStatus()
      .then((s) => setWorkflowsRaros(!!s.addons.workflows_raros))
      .catch(() => setWorkflowsRaros(false))
  }, [open])

  if (!sentenca) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isRenuncia && !confirmRenuncia) {
      setErro('Marque a confirmação de irreversibilidade da renúncia.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await aplicarPosExtincao(processoId, {
        sentencaId: sentenca!.id,
        modalidade,
        motivo,
        observacao: observacao.trim() || null,
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
      title="Extinção sem mérito"
      subtitle={processoNumero ?? processoId}
      onClose={onClose}
      footer={
        isRenuncia ? (
          <>
            <Btn
              type="submit"
              form="popup-pos-extincao"
              variant="danger"
              loading={salvando}
              disabled={!confirmRenuncia}
              className="flex-1 sm:flex-none"
            >
              Confirmar renúncia irreversível
            </Btn>
            <Btn type="button" variant="default" onClick={onClose} disabled={salvando}>
              Cancelar
            </Btn>
          </>
        ) : (
          <PopupFooterActions
            formId="popup-pos-extincao"
            onCancel={onClose}
            loading={salvando}
          />
        )
      }
    >
      <form id="popup-pos-extincao" onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs text-[var(--color-text-secondary)]">
          Sentença de {sentenca.data} — classifique modalidade e motivo.
        </p>
        {erro ? <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p> : null}
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Modalidade *
          <select
            value={modalidade}
            onChange={(e) => {
              setModalidade(e.target.value as ModalidadeId)
              setConfirmRenuncia(false)
            }}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          >
            {opcoesModalidade.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {isRenuncia ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            <p className="font-semibold">Atenção: renúncia irreversível</p>
            <p className="mt-1">
              Gera coisa julgada material. Não há recurso nem reprotocolo após a confirmação.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={confirmRenuncia}
                onChange={(e) => setConfirmRenuncia(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Confirmo que o cliente foi orientado sobre a irreversibilidade desta renúncia
              </span>
            </label>
          </div>
        ) : null}

        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Motivo *
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          >
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Observações
          <textarea
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          />
        </label>
      </form>
    </PopupShell>
  )
}
