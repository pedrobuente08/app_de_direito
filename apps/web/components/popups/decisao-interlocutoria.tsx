'use client'

import { useEffect, useState } from 'react'
import { classificarDecisaoInterlocutoria } from '@/lib/api'
import type { TipoInterlocutoria } from '@/lib/types'
import { PopupFooterActions, PopupShell } from './popup-shell'

const TIPOS: { id: TipoInterlocutoria; label: string }[] = [
  { id: 'TUTELA_DEFERIDA', label: 'Tutela deferida' },
  { id: 'TUTELA_INDEFERIDA', label: 'Tutela indeferida' },
  { id: 'EMENDA_INICIAL', label: 'Emenda à inicial' },
  { id: 'JUNTADA_DOCUMENTOS', label: 'Juntada de documentos' },
  { id: 'CITACAO_REALIZADA', label: 'Citação realizada' },
  { id: 'SANEAMENTO', label: 'Saneamento' },
  { id: 'OUTRO_INTERLOCUTORIO', label: 'Outro interlocutório' },
]

type Props = {
  open: boolean
  processoId: string
  processoNumero?: string | null
  comunicacaoId?: string
  onClose: () => void
  onSuccess: () => void
}

export function PopUpDecisaoInterlocutoria({
  open,
  processoId,
  processoNumero,
  comunicacaoId,
  onClose,
  onSuccess,
}: Props) {
  const [tipo, setTipo] = useState<TipoInterlocutoria>('OUTRO_INTERLOCUTORIO')
  const [conteudo, setConteudo] = useState('')
  const [prazoCumprimento, setPrazoCumprimento] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTipo('OUTRO_INTERLOCUTORIO')
    setConteudo('')
    setPrazoCumprimento('')
    setObservacoes('')
    setErro(null)
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      await classificarDecisaoInterlocutoria({
        processoId,
        tipo,
        conteudo: conteudo.trim() || undefined,
        prazoCumprimento: prazoCumprimento || undefined,
        observacoes: observacoes.trim() || undefined,
        comunicacaoId,
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
      title="Decisão interlocutória"
      subtitle={processoNumero ?? processoId}
      onClose={onClose}
      widthClass="w-[min(32rem,calc(100vw-2rem))]"
      footer={
        <PopupFooterActions
          formId="popup-decisao-interlocutoria"
          onCancel={onClose}
          loading={salvando}
        />
      }
    >
      <form
        id="popup-decisao-interlocutoria"
        onSubmit={handleSubmit}
        className="space-y-3"
      >
        <p className="text-xs text-[var(--color-text-secondary)]">
          Classifique a decisão para disparar pendências e encadeamentos automáticos.
        </p>
        {erro ? (
          <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p>
        ) : null}
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Tipo de decisão *
          <select
            required
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoInterlocutoria)}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Conteúdo resumido
          <textarea
            rows={3}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
            placeholder="Resumo da decisão…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Prazo de cumprimento (se aplicável)
          <input
            type="date"
            value={prazoCumprimento}
            onChange={(e) => setPrazoCumprimento(e.target.value)}
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
      </form>
    </PopupShell>
  )
}
