'use client'

import { useMemo, useState } from 'react'
import { PosImprocedenciaDialog } from '@/components/sentencas/pos-improcedencia-dialog'
import { createSentenca } from '@/lib/api'
import { mergeSentencaOpcoes } from '@/lib/sentenca-opcoes'
import {
  resultadoSentencaExigeValor,
  validarFormSentenca,
} from '@/lib/sentenca-validacao'
import type { DropdownsProcessoConfig, Sentenca } from '@/lib/types'
import type { ToastApi } from './processo-editable'

const GRAUS = ['PRIMEIRO_GRAU', 'SEGUNDO_GRAU', 'EMBARGOS'] as const
const FAVORAVEIS = ['AUTOR', 'REU'] as const

const GRAU_LABEL: Record<string, string> = {
  PRIMEIRO_GRAU: '1º grau',
  SEGUNDO_GRAU: '2º grau',
  EMBARGOS: 'Embargos',
}

type Props = {
  processoId: string
  processoNumero?: string | null
  sentencas: Sentenca[]
  readOnly?: boolean
  dropdowns?: DropdownsProcessoConfig | null
  toast: ToastApi
  onCreated: () => void
}

function normResultado(r: string): string {
  return r.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
}

function isPrimeiroGrau(grau: string): boolean {
  const g = grau.trim().toUpperCase()
  return !g.includes('SEGUNDO') && g !== 'STJ' && g !== 'TST'
}

export function RegistrarSentencaSection({
  processoId,
  processoNumero,
  sentencas,
  readOnly,
  dropdowns,
  toast,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false)
  const [posImprocedencia, setPosImprocedencia] = useState<Sentenca | null>(null)
  const [saving, setSaving] = useState(false)
  const [grau, setGrau] = useState<string>('PRIMEIRO_GRAU')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [valor, setValor] = useState('')
  const [resultado, setResultado] = useState('')
  const [favoravelPara, setFavoravelPara] = useState('AUTOR')
  const [formError, setFormError] = useState<string | null>(null)

  const resultadoOpts = useMemo(
    () => mergeSentencaOpcoes(dropdowns?.sentenca),
    [dropdowns],
  )

  const exigeValor = resultadoSentencaExigeValor(resultado)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validarFormSentenca({ data, resultado, favoravelPara, valor })
    if (err) {
      setFormError(err)
      return
    }
    setFormError(null)
    setSaving(true)
    try {
      const created = await createSentenca({
        processoId,
        grau,
        data: data.slice(0, 10),
        resultado: resultado.trim(),
        favoravelPara: favoravelPara.trim().toUpperCase(),
        valor: valor.trim() ? valor.trim() : null,
      })
      toast.success('Sentença registrada.')
      setOpen(false)
      setValor('')
      setResultado('')
      onCreated()
      if (
        normResultado(created.resultado) === 'IMPROCEDENTE' &&
        isPrimeiroGrau(created.grau)
      ) {
        setPosImprocedencia(created)
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="col-span-2 sm:col-span-3 space-y-3">
      {sentencas.length > 0 ? (
        <ul className="space-y-2">
          {sentencas.map((s) => (
            <li
              key={s.id}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2 text-xs"
            >
              <p className="font-medium text-[var(--color-text-primary)]">
                {GRAU_LABEL[s.grau] ?? s.grau} — {s.resultado}
              </p>
              <p className="text-[var(--color-text-secondary)]">
                {s.data}
                {s.valor ? ` · R$ ${s.valor}` : ''}
                {' · '}
                {s.favoravelPara === 'AUTOR' ? 'Favorável ao autor' : 'Favorável ao réu'}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Nenhuma sentença cadastrada neste processo.
        </p>
      )}

      {!readOnly && (
        <>
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand)] hover:bg-[var(--color-bg-hover)]"
            >
              + Registrar sentença
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3"
            >
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                Nova sentença
              </p>
              {formError ? (
                <p className="text-xs text-[var(--urgencia-vencida-text)]">{formError}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[10px] text-[var(--color-text-secondary)]">
                  Grau *
                  <select
                    value={grau}
                    onChange={(e) => setGrau(e.target.value)}
                    className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                  >
                    {GRAUS.map((g) => (
                      <option key={g} value={g}>{GRAU_LABEL[g]}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[10px] text-[var(--color-text-secondary)]">
                  Data *
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                  />
                </label>
                <label className="col-span-2 flex flex-col gap-1 text-[10px] text-[var(--color-text-secondary)]">
                  Resultado *
                  <select
                    required
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value)}
                    className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                  >
                    <option value="">Selecione…</option>
                    {resultadoOpts.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[10px] text-[var(--color-text-secondary)]">
                  Favorável a *
                  <select
                    value={favoravelPara}
                    onChange={(e) => setFavoravelPara(e.target.value)}
                    className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                  >
                    {FAVORAVEIS.map((f) => (
                      <option key={f} value={f}>
                        {f === 'AUTOR' ? 'Autor' : 'Réu'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[10px] text-[var(--color-text-secondary)]">
                  Valor {exigeValor ? '*' : '(opcional)'}
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="rounded border border-[var(--color-border-default)] px-2 py-1 text-sm"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : 'Salvar sentença'}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setFormError(null) }}
                  className="rounded border border-[var(--color-border-default)] px-3 py-1.5 text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </>
      )}

      <PosImprocedenciaDialog
        open={!!posImprocedencia}
        processoId={processoId}
        processoNumero={processoNumero}
        sentenca={posImprocedencia}
        onClose={() => setPosImprocedencia(null)}
        onSuccess={() => {
          toast.success('Decisão pós-improcedência registrada.')
          onCreated()
        }}
      />
    </div>
  )
}
