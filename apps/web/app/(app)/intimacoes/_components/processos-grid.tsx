'use client'

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import type { Processo } from '@/lib/types'

function dateDisplay(v: string | null | undefined): string {
  if (!v) return '—'
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  }
  return s || '—'
}

type Props = {
  data: Processo[]
  onRowClick: (processo: Processo) => void
}

export function ProcessosGrid({ data, onRowClick }: Props) {
  const columns = useMemo<ColumnDef<Processo>[]>(() => [
    {
      id: 'flags',
      header: '',
      size: 72,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.requerConferencia ? (
            <span className="rounded-full bg-[var(--urgencia-atencao-bg)] px-2 py-0.5 text-[10px] text-[var(--urgencia-atencao-text)]">
              Conferir
            </span>
          ) : null}
        </div>
      ),
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
      size: 180,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.reuTexto ?? '—'}</span>
      ),
    },
    {
      id: 'vara',
      header: 'Vara',
      size: 100,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.vara ?? '—'}</span>
      ),
    },
    {
      id: 'sistema',
      header: 'Sistema',
      size: 90,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.sistema ?? '—'}</span>
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
      id: 'dataDistribuicao',
      header: 'Distribuição',
      size: 110,
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-primary)]">
          {dateDisplay(row.original.dataDistribuicao)}
        </span>
      ),
    },
    {
      id: 'situacao',
      header: 'Situação',
      size: 110,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.situacao ?? '—'}</span>
      ),
    },
  ], [])

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
