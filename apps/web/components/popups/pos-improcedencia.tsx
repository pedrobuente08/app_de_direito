'use client'

import { useEffect, useState } from 'react'
import { aplicarPosImprocedencia } from '@/lib/api'
import type { Sentenca } from '@/lib/types'
import { PopupFooterActions, PopupShell } from './popup-shell'

const DECISOES = [
  { id: 'RECORRER' as const, label: 'Recorrer' },
  { id: 'NAO_RECORRER' as const, label: 'Não recorrer' },
  { id: 'AVALIAR' as const, label: 'Avaliar (prazo)' },
]

type Props = {
  open: boolean
  processoId: string
  processoNumero?: string | null
  sentenca: Sentenca | null
  onClose: () => void
  onSuccess: () => void
}

export function PopUpPosImprocedencia({
  open,
  processoId,
  processoNumero,
  sentenca,
  onClose,
  onSuccess,
}: Props) {
  const [decisao, setDecisao] = useState<'RECORRER' | 'NAO_RECORRER' | 'AVALIAR'>('AVALIAR')
  const [valor, setValor] = useState('')
  const [observacao, setObservacao] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [prazoDias, setPrazoDias] = useState('7')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !sentenca) return
    setDecisao('AVALIAR')
    setValor(sentenca.valor ?? '')
    setObservacao('')
    setResponsavel('')
    setPrazoDias('7')
    setErro(null)
  }, [open, sentenca])

  if (!sentenca) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      await aplicarPosImprocedencia(processoId, {
        sentencaId: sentenca!.id,
        decisao,
        valorSucumbencia: valor.trim() || null,
        observacao: observacao.trim() || null,
        responsavel: responsavel.trim() || null,
        ...(decisao === 'AVALIAR' && prazoDias.trim()
          ? { prazoDias: Number(prazoDias) }
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
      title="Sentença improcedente"
      subtitle={processoNumero ?? processoId}
      onClose={onClose}
      footer={
        <PopupFooterActions
          formId="popup-pos-improcedencia"
          onCancel={onClose}
          loading={salvando}
          confirmLabel={salvando ? 'Salvando…' : 'Confirmar'}
        />
      }
    >
      <form id="popup-pos-improcedencia" onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs text-[var(--color-text-secondary)]">
          Data {sentenca.data} — defina a estratégia de recurso.
        </p>
        {erro ? (
          <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p>
        ) : null}
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Valor (sucumbência ou 0)
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-[var(--color-text-secondary)]">
            Decisão *
          </legend>
          {DECISOES.map((d) => (
            <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="decisao"
                checked={decisao === d.id}
                onChange={() => setDecisao(d.id)}
              />
              {d.label}
            </label>
          ))}
        </fieldset>
        {decisao === 'AVALIAR' ? (
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Prazo (dias)
            <input
              type="number"
              min={1}
              value={prazoDias}
              onChange={(e) => setPrazoDias(e.target.value)}
              className="w-24 rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
        ) : null}
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

export const PosImprocedenciaDialog = PopUpPosImprocedencia
