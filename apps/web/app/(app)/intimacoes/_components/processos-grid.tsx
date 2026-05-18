'use client'

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import type { Processo } from '@/lib/types'

type Props = {
  data: Processo[]
  onRowClick: (processo: Processo) => void
  readOnly?: boolean
  onAddPendencia?: (processo: Processo) => void
}

export function ProcessosGrid({
  data,
  onRowClick,
  readOnly,
  onAddPendencia,
}: Props) {
  const columns = useMemo<ColumnDef<Processo>[]>(() => [
    {
      id: 'flags',
      header: '',
      size: 72,
      cell: ({ row }) => {
        const av = row.original.avaliacaoRecurso as { ativa?: boolean; prazo?: string } | null
        const emAvaliacao = av?.ativa === true
        return (
          <div className="flex flex-wrap gap-1">
            {emAvaliacao ? (
              <span
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900"
                title={av?.prazo ? `Prazo: ${av.prazo}` : 'Em avaliação de recurso'}
              >
                AVALIAR
              </span>
            ) : null}
            {row.original.requerConferencia ? (
              <span className="rounded-full bg-[var(--urgencia-atencao-bg)] px-2 py-0.5 text-[10px] text-[var(--urgencia-atencao-text)]">
                Conferir
              </span>
            ) : null}
          </div>
        )
      },
    },
    {
      id: 'numero',
      header: 'Número',
      size: 168,
      accessorKey: 'numero',
      cell: ({ row }) => (
        <span className="block whitespace-nowrap font-mono text-xs text-[var(--color-text-primary)]">
          {row.original.numero}
        </span>
      ),
    },
    {
      id: 'clienteNome',
      header: 'Cliente',
      size: 180,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.clienteNome ?? '—'}</span>
      ),
    },
    {
      id: 'reuTexto',
      header: 'Réu',
      size: 140,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.reuTexto?.trim() || '—'}</span>
      ),
    },
    {
      id: 'materia',
      header: 'Matéria',
      size: 140,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.materia?.trim() || '—'}</span>
      ),
    },
    {
      id: 'vara',
      header: 'Vara',
      size: 100,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.vara?.trim() || '—'}</span>
      ),
    },
    {
      id: 'login',
      header: 'Login',
      size: 100,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.login ?? '—'}</span>
      ),
    },
    {
      id: 'qualidadeCaso',
      header: 'Situação',
      size: 160,
      cell: ({ row }) => (
        <span className="block truncate text-sm">
          {row.original.qualidadeCaso?.trim() || '—'}
        </span>
      ),
    },
    {
      id: 'faseAtual',
      header: 'Fase atual',
      size: 130,
      cell: ({ row }) => (
        <span className="block truncate text-sm text-[var(--color-text-primary)]">
          {row.original.faseAtual?.trim() || '—'}
        </span>
      ),
    },
    {
      id: 'ultimaSentencaResultado',
      header: 'Sentença',
      size: 110,
      cell: ({ row }) => (
        <span className="block truncate text-sm">
          {row.original.ultimaSentencaResultado?.trim() || '—'}
        </span>
      ),
    },
    {
      id: 'ultimaMovimentacaoDt',
      header: 'Últ. mov.',
      size: 100,
      cell: ({ row }) => (
        <span className="block truncate text-xs text-[var(--color-text-secondary)]">
          {row.original.ultimaMovimentacaoDt?.slice(0, 10) ?? '—'}
        </span>
      ),
    },
    ...(onAddPendencia && !readOnly
      ? [
          {
            id: 'acoes',
            header: '',
            size: 88,
            cell: ({ row }: { row: { original: Processo } }) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddPendencia(row.original)
                }}
                className="text-xs text-[var(--color-brand)] hover:underline"
              >
                + Pendência
              </button>
            ),
          } as ColumnDef<Processo>,
        ]
      : []),
  ], [onAddPendencia, readOnly])

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
      <table className="w-max min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--color-bg-muted)] shadow-sm">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  style={{ width: h.getSize() }}
                  className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]"
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[var(--color-border-default)]">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original)}
              className="cursor-pointer hover:bg-[var(--color-bg-hover)]"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="border-r border-[var(--color-border-default)] px-2 py-2 align-middle last:border-r-0"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
