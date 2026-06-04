'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Comunicacao } from '@/lib/types'
import { RegistrarProcessoModal } from './registrar-processo-modal'

type Props = {
  orfas: Comunicacao[]
  total?: number
  materias?: string[]
  onResolved: () => void
}

export function OrfasSection({ orfas, total, materias, onResolved }: Props) {
  const [selecionada, setSelecionada] = useState<Comunicacao | null>(null)

  if (orfas.length === 0) return null

  const totalReal = total ?? orfas.length
  const temMais = totalReal > orfas.length

  return (
    <>
      <section className="mb-6 rounded-[var(--radius-md)] border border-amber-400/60 bg-amber-50/60 p-4 dark:border-amber-600/40 dark:bg-amber-900/10">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white">
            {totalReal}
          </span>
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Publicações aguardando registro de processo
          </h2>
          <span className="text-xs text-amber-700/70 dark:text-amber-400/70">
            DJEN identificou publicações vinculadas a processos ainda não cadastrados
          </span>
        </div>

        <div className="space-y-2">
          {orfas.map((c) => {
            const dataFmt = c.dataDisponibilizacao
              ? new Date(c.dataDisponibilizacao).toLocaleDateString('pt-BR')
              : null

            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-amber-300/60 bg-white/80 px-3 py-2.5 dark:border-amber-700/40 dark:bg-amber-950/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">
                      {c.numeroProcessoBruto ?? '—'}
                    </span>
                    {c.tipo && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                        {c.tipo}
                      </span>
                    )}
                    {dataFmt && (
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {dataFmt}
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      OAB {c.oab}
                    </span>
                  </div>
                  {c.resumo && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                      {c.resumo}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelecionada(c)}
                  className="shrink-0 rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                >
                  Registrar
                </button>
              </div>
            )
          })}
        </div>

        {temMais && (
          <div className="mt-3 text-center">
            <Link
              href="/comunicacoes"
              className="text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
            >
              Ver todas as {totalReal} publicações →
            </Link>
          </div>
        )}
      </section>

      {selecionada && (
        <RegistrarProcessoModal
          comunicacao={selecionada}
          materias={materias}
          onClose={() => setSelecionada(null)}
          onSuccess={() => {
            setSelecionada(null)
            onResolved()
          }}
        />
      )}
    </>
  )
}
