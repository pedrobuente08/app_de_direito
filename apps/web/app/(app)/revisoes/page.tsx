'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getExtracoesPendentes } from '@/lib/api'
import type { ExtracaoPendente } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_REVISAO: 'Em revisão',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
}

const STATUS_CLASS: Record<string, string> = {
  PENDENTE:
    'bg-[var(--urgencia-urgente-bg)] text-[var(--urgencia-urgente-text)]',
  EM_REVISAO:
    'bg-[var(--urgencia-atencao-bg)] text-[var(--urgencia-atencao-text)]',
  APROVADO:
    'bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]',
  REJEITADO:
    'bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]',
}

export default function RevisoesPage() {
  const [items, setItems] = useState<ExtracaoPendente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setItems(await getExtracoesPendentes())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Revisões de extração
        </h1>
        <button
          onClick={load}
          className="text-sm text-[var(--color-brand)] hover:underline"
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded bg-[var(--color-bg-subtle)]"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] px-4 py-3 text-sm text-[var(--urgencia-vencida-text)]">
          {error}{' '}
          <button onClick={load} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhuma revisão pendente.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-muted)]">
              <tr>
                {['Arquivo', 'Confidence', 'Alerta', 'Status', 'Data', ''].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--color-bg-hover)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">
                    {item.arquivoNome}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {Math.round(item.confidence * 100)}%
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {item.alerta ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[item.revisaoStatus] ?? ''}`}
                    >
                      {STATUS_LABEL[item.revisaoStatus] ?? item.revisaoStatus}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/revisoes/${item.id}`}
                      className="text-[var(--color-brand)] hover:underline"
                    >
                      Revisar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
