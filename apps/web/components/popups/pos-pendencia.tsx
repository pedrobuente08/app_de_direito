'use client'

import { useEffect, useState } from 'react'
import { encerrarPendencia } from '@/lib/api'
import type { Pendencia } from '@/lib/types'
import { PopupFooterActions, PopupShell } from './popup-shell'

const RESULTADOS = [
  { id: 'CUMPRIDA', label: 'Cumprida' },
  { id: 'NAO_CUMPRIDA', label: 'Não cumprida' },
  { id: 'SEM_EXITO', label: 'Sem êxito' },
  { id: 'AUTOR_FALECIDO', label: 'Autor falecido' },
  { id: 'DEIXOU_DE_RESPONDER', label: 'Deixou de responder' },
] as const

type Props = {
  open: boolean
  pendencia: Pendencia | null
  onClose: () => void
  onSuccess: () => void
}

export function PopUpPosPendencia({ open, pendencia, onClose, onSuccess }: Props) {
  const [resultado, setResultado] = useState<string>('CUMPRIDA')
  const [motivo, setMotivo] = useState('')
  const [observacao, setObservacao] = useState('')
  const [proximaAcao, setProximaAcao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const exigeMotivo =
    resultado !== 'CUMPRIDA' && resultado !== 'AUTOR_FALECIDO'

  useEffect(() => {
    if (!open) return
    setResultado('CUMPRIDA')
    setMotivo('')
    setObservacao('')
    setProximaAcao('')
    setErro(null)
  }, [open, pendencia?.id])

  if (!pendencia) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (exigeMotivo && !motivo.trim()) {
      setErro('Informe o motivo.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await encerrarPendencia(pendencia!.id, {
        resultado: resultado as (typeof RESULTADOS)[number]['id'],
        motivo: motivo.trim() || null,
        observacao: observacao.trim() || null,
        proximaAcao: proximaAcao.trim() || null,
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
      title="Encerrar pendência"
      subtitle={`${pendencia.tipo} · ${pendencia.processo?.numero ?? pendencia.processoId}`}
      onClose={onClose}
      footer={
        <PopupFooterActions formId="popup-pos-pendencia" onCancel={onClose} loading={salvando} />
      }
    >
      <form id="popup-pos-pendencia" onSubmit={handleSubmit} className="space-y-3">
        {erro ? <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p> : null}
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Resultado *
          <select
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          >
            {RESULTADOS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        {exigeMotivo ? (
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            Motivo *
            <textarea
              required
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Próxima ação
          <input
            value={proximaAcao}
            onChange={(e) => setProximaAcao(e.target.value)}
            placeholder="Opcional"
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          />
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
