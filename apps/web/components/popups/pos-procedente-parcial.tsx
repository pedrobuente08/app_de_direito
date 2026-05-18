'use client'

import { useEffect, useState } from 'react'
import { aplicarPosProcedenteParcial } from '@/lib/api'
import type { Sentenca } from '@/lib/types'
import { PopupFooterActions, PopupShell } from './popup-shell'

const DECISOES = [
  { id: 'RECORRER_PARA_MAJORAR' as const, label: 'Recorrer para majorar' },
  { id: 'NAO_RECORRER' as const, label: 'Não recorrer' },
  { id: 'AVALIAR' as const, label: 'Avaliar' },
]

type Props = {
  open: boolean
  processoId: string
  processoNumero?: string | null
  sentenca: Sentenca | null
  onClose: () => void
  onSuccess: () => void
}

export function PopUpPosProcedenteParcial({
  open,
  processoId,
  processoNumero,
  sentenca,
  onClose,
  onSuccess,
}: Props) {
  const [decisao, setDecisao] = useState<(typeof DECISOES)[number]['id']>('AVALIAR')
  const [valorConcedido, setValorConcedido] = useState('')
  const [valorPedido, setValorPedido] = useState('')
  const [observacao, setObservacao] = useState('')
  const [prazoDias, setPrazoDias] = useState('7')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !sentenca) return
    setDecisao('AVALIAR')
    setValorConcedido(sentenca.valor ?? '')
    setValorPedido('')
    setObservacao('')
    setPrazoDias('7')
    setErro(null)
  }, [open, sentenca])

  if (!sentenca) return null

  const gap =
    valorConcedido.trim() && valorPedido.trim()
      ? (Number(valorPedido) - Number(valorConcedido)).toFixed(2)
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      await aplicarPosProcedenteParcial(processoId, {
        sentencaId: sentenca!.id,
        decisao,
        valorConcedido: valorConcedido.trim() || null,
        valorPedido: valorPedido.trim() || null,
        observacao: observacao.trim() || null,
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
      title="Procedente parcial"
      subtitle={processoNumero ?? processoId}
      onClose={onClose}
      footer={
        <PopupFooterActions formId="popup-pos-parcial" onCancel={onClose} loading={salvando} />
      }
    >
      <form id="popup-pos-parcial" onSubmit={handleSubmit} className="space-y-3">
        {erro ? <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Valor concedido
            <input
              value={valorConcedido}
              onChange={(e) => setValorConcedido(e.target.value)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Valor pedido
            <input
              value={valorPedido}
              onChange={(e) => setValorPedido(e.target.value)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        {gap ? (
          <p className="text-xs text-[var(--color-text-secondary)]">
            Gap estimado: R$ {gap}
          </p>
        ) : null}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium">Decisão *</legend>
          {DECISOES.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={decisao === d.id}
                onChange={() => setDecisao(d.id)}
              />
              {d.label}
            </label>
          ))}
        </fieldset>
        {decisao === 'AVALIAR' ? (
          <label className="flex flex-col gap-1 text-xs">
            Prazo (dias)
            <input
              type="number"
              min={1}
              value={prazoDias}
              onChange={(e) => setPrazoDias(e.target.value)}
              className="w-24 rounded border px-2 py-1.5 text-sm"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-xs">
          Observações
          <textarea
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </label>
      </form>
    </PopupShell>
  )
}
