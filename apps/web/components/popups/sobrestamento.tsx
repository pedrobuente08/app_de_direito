'use client'

import { useEffect, useState } from 'react'
import { sobrestarProcesso } from '@/lib/api'
import { PopupFooterActions, PopupShell } from './popup-shell'

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
  const [motivo, setMotivo] = useState('')
  const [desde, setDesde] = useState(() => new Date().toISOString().slice(0, 10))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMotivo('')
    setDesde(new Date().toISOString().slice(0, 10))
    setErro(null)
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo.trim()) {
      setErro('Informe o motivo do sobrestamento.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await sobrestarProcesso(processoId, {
        motivo: motivo.trim(),
        sobrestadoDesde: desde,
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
        </p>
        {erro ? <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p> : null}
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
