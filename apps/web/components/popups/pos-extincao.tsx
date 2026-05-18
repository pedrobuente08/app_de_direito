'use client'

import { useEffect, useState } from 'react'
import { aplicarPosExtincao } from '@/lib/api'
import type { Sentenca } from '@/lib/types'
import { PopupFooterActions, PopupShell } from './popup-shell'

const MODALIDADES = [
  { id: 'SEM_CUSTAS' as const, label: 'Sem custas' },
  { id: 'COM_CUSTAS' as const, label: 'Com custas' },
  { id: 'COM_MA_FE' as const, label: 'Com má-fé' },
]

const MOTIVOS = [
  'AUTOR_FALTOU',
  'INDEFERIMENTO_INICIAL',
  'AUS_PRESSUPOSTOS',
  'OUTRO',
] as const

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
  const [modalidade, setModalidade] = useState<(typeof MODALIDADES)[number]['id']>('SEM_CUSTAS')
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0])
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setModalidade('SEM_CUSTAS')
    setMotivo(MOTIVOS[0])
    setObservacao('')
    setErro(null)
  }, [open])

  if (!sentenca) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
        <PopupFooterActions
          formId="popup-pos-extincao"
          onCancel={onClose}
          loading={salvando}
        />
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
            onChange={(e) => setModalidade(e.target.value as typeof modalidade)}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          >
            {MODALIDADES.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Motivo *
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          >
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
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
