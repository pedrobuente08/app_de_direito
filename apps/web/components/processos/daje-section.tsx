'use client'

import { useState } from 'react'
import {
  dajeEmitir,
  dajeInadimplencia,
  dajePedirIsencao,
  dajeRegistrarPagamento,
  dajeResultadoIsencao,
} from '@/lib/api'
import type { Processo } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  EMITIDO: 'Emitido',
  ISENCAO_PEDIDA: 'Isenção pedida',
  ISENCAO_DEFERIDA: 'Isenção deferida',
  ISENCAO_INDEFERIDA: 'Isenção indeferida',
  PAGO: 'Pago',
  DIVIDA_ATIVA: 'Dívida ativa',
  ARQUIVADO_SEM_PAGAMENTO: 'Arquivado sem pagamento',
}

type Props = {
  processo: Processo
  readOnly?: boolean
  onUpdated: (p: Processo) => void
  toast: { success: (m: string) => void; error: (m: string) => void }
}

export function DajeSection({ processo, readOnly, onUpdated, toast }: Props) {
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)

  const mostrar =
    processo.dajeEmitido ||
    (processo.faseAtual ?? '').toUpperCase().includes('CUSTAS') ||
    (processo.faseAtual ?? '').toUpperCase().includes('ISENCAO')

  if (!mostrar && !readOnly) {
    return (
      <div className="col-span-2 sm:col-span-3">
        <button
          type="button"
          disabled={salvando}
          className="text-xs text-[var(--color-brand)] hover:underline"
          onClick={async () => {
            if (!valor.trim()) {
              toast.error('Informe o valor do DAJE.')
              return
            }
            setSalvando(true)
            try {
              const p = await dajeEmitir(processo.id, { valor: valor.trim() })
              onUpdated(p)
              toast.success('DAJE emitido.')
            } catch (e) {
              toast.error((e as Error).message)
            } finally {
              setSalvando(false)
            }
          }}
        >
          Registrar emissão de DAJE
        </button>
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor (R$)"
          className="ml-2 w-28 rounded border px-2 py-1 text-xs"
        />
      </div>
    )
  }

  if (!processo.dajeEmitido) return null

  const st = processo.dajeStatus ?? '—'

  async function run(fn: () => Promise<Processo>, ok: string) {
    setSalvando(true)
    try {
      const p = await fn()
      onUpdated(p)
      toast.success(ok)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="col-span-2 space-y-2 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-muted)] p-3 sm:col-span-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        DAJE (custas)
      </p>
      <p className="text-sm">
        Status: <strong>{STATUS_LABEL[st] ?? st}</strong>
        {processo.dajeValor ? ` · R$ ${processo.dajeValor}` : ''}
        {processo.dajeDataEmissao ? ` · emissão ${processo.dajeDataEmissao}` : ''}
      </p>
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          {st === 'EMITIDO' || st === 'ISENCAO_INDEFERIDA' ? (
            <button
              type="button"
              disabled={salvando}
              className="rounded bg-[var(--color-brand)] px-2 py-1 text-xs text-white disabled:opacity-50"
              onClick={() => void run(() => dajePedirIsencao(processo.id), 'Pedido de isenção registrado.')}
            >
              Pedir isenção
            </button>
          ) : null}
          {st === 'ISENCAO_PEDIDA' ? (
            <>
              <button
                type="button"
                disabled={salvando}
                className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                onClick={() =>
                  void run(
                    () => dajeResultadoIsencao(processo.id, { resultado: 'DEFERIDA' }),
                    'Isenção deferida.',
                  )
                }
              >
                Isenção deferida
              </button>
              <button
                type="button"
                disabled={salvando}
                className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                onClick={() =>
                  void run(
                    () => dajeResultadoIsencao(processo.id, { resultado: 'INDEFERIDA' }),
                    'Isenção indeferida.',
                  )
                }
              >
                Isenção indeferida
              </button>
            </>
          ) : null}
          {(st === 'EMITIDO' || st === 'ISENCAO_INDEFERIDA') && (
            <button
              type="button"
              disabled={salvando}
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
              onClick={() =>
                void run(() => dajeRegistrarPagamento(processo.id), 'Pagamento registrado.')
              }
            >
              Registrar pagamento
            </button>
          )}
          {st !== 'PAGO' && st !== 'ISENCAO_DEFERIDA' && (
            <button
              type="button"
              disabled={salvando}
              className="rounded border border-[var(--urgencia-vencida-border)] px-2 py-1 text-xs disabled:opacity-50"
              onClick={() =>
                void run(async () => {
                  const res = await dajeInadimplencia(processo.id)
                  return res.processo
                }, 'Inadimplência registrada.')
              }
            >
              Registrar inadimplência
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
