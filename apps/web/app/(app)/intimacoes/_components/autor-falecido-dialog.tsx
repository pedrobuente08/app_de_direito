'use client'

import { useEffect, useState } from 'react'
import { registrarAutorFalecido } from '@/lib/api'
import { PopupFooterActions, PopupShell } from '@/components/popups/popup-shell'

type SucessorLinha = { nome: string; cpf: string; parentesco: string }

type Props = {
  open: boolean
  processoId: string
  processoNumero?: string | null
  onClose: () => void
  onSuccess: () => void
}

const linhaVazia = (): SucessorLinha => ({ nome: '', cpf: '', parentesco: '' })

export function AutorFalecidoDialog({
  open,
  processoId,
  processoNumero,
  onClose,
  onSuccess,
}: Props) {
  const [dataObito, setDataObito] = useState(() => new Date().toISOString().slice(0, 10))
  const [sucessores, setSucessores] = useState<SucessorLinha[]>([linhaVazia()])
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDataObito(new Date().toISOString().slice(0, 10))
    setSucessores([linhaVazia()])
    setObservacoes('')
    setErro(null)
  }, [open])

  function atualizarLinha(i: number, patch: Partial<SucessorLinha>) {
    setSucessores((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validos = sucessores.filter((s) => s.nome.trim())
    if (validos.length === 0) {
      setErro('Cadastre ao menos um sucessor.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await registrarAutorFalecido(processoId, {
        dataObito,
        sucessores: validos.map((s) => ({
          nome: s.nome.trim(),
          cpf: s.cpf.trim() || undefined,
          parentesco: s.parentesco.trim() || undefined,
        })),
        observacoes: observacoes.trim() || undefined,
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
      title="Registrar óbito do autor"
      subtitle={processoNumero ?? processoId}
      onClose={onClose}
      widthClass="w-[min(36rem,calc(100vw-2rem))]"
      footer={
        <PopupFooterActions
          formId="autor-falecido-form"
          onCancel={onClose}
          loading={salvando}
          confirmLabel="Registrar e sobrestar"
        />
      }
    >
      <form id="autor-falecido-form" onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs text-[var(--color-text-secondary)]">
          O processo será sobrestado e pendências serão abertas para cada herdeiro não habilitado.
        </p>
        {erro ? <p className="text-xs text-[var(--urgencia-vencida-text)]">{erro}</p> : null}
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
          Data do óbito *
          <input
            type="date"
            required
            value={dataObito}
            onChange={(e) => setDataObito(e.target.value)}
            className="rounded border border-[var(--color-border-default)] px-2 py-1.5 text-sm"
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Sucessores / herdeiros
            </span>
            <button
              type="button"
              className="text-xs text-[var(--color-brand)] hover:underline"
              onClick={() => setSucessores((r) => [...r, linhaVazia()])}
            >
              + Adicionar herdeiro
            </button>
          </div>
          {sucessores.map((s, i) => (
            <div
              key={i}
              className="grid gap-2 rounded border border-[var(--color-border-default)] p-2 sm:grid-cols-3"
            >
              <input
                required={i === 0}
                value={s.nome}
                onChange={(e) => atualizarLinha(i, { nome: e.target.value })}
                placeholder="Nome *"
                className="rounded border px-2 py-1.5 text-sm sm:col-span-1"
              />
              <input
                value={s.cpf}
                onChange={(e) => atualizarLinha(i, { cpf: e.target.value })}
                placeholder="CPF"
                className="rounded border px-2 py-1.5 text-sm"
              />
              <div className="flex gap-1">
                <input
                  value={s.parentesco}
                  onChange={(e) => atualizarLinha(i, { parentesco: e.target.value })}
                  placeholder="Parentesco"
                  className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
                />
                {sucessores.length > 1 ? (
                  <button
                    type="button"
                    className="shrink-0 px-2 text-xs text-[var(--color-text-secondary)] hover:underline"
                    onClick={() =>
                      setSucessores((rows) => rows.filter((_, idx) => idx !== i))
                    }
                  >
                    Remover
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

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
