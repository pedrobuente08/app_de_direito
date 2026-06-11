'use client'

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { faseLabel } from '@/lib/fase-label'
import type { Processo } from '@/lib/types'

function rowTintStyle(hex?: string | null): React.CSSProperties | undefined {
  if (!hex?.startsWith('#') || hex.length < 7) return undefined
  return { backgroundColor: `${hex}14` }
}

function isAutorFalecido(p: Processo): boolean {
  const m = p.sobrestamentoMotivo?.toUpperCase() ?? ''
  return m.includes('AUTOR_FALECIDO')
}

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
            {row.original.requerConferencia &&
            (row.original.origemCriacao === 'DJEN_AUTO' ||
              row.original.origemCriacao === 'ONBOARDING') ? (
              <span
                className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-900"
                title="Processo criado automaticamente pelo DJEN. Verifique e complete os dados."
              >
                Auto
              </span>
            ) : null}
            {row.original.litiganciaMaFe ? (
              <span
                className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800"
                title="Processo com litigância de má-fé — monitoramento prioritário. Risco de penhora/bloqueio de conta do cliente."
              >
                MÁ-FÉ
              </span>
            ) : null}
            {isAutorFalecido(row.original) ? (
              <span
                className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-800"
                title="Autor falecido — aguardando habilitação de sucessores"
              >
                FALECIDO
              </span>
            ) : null}
            {row.original.extincaoModalidade === 'RENUNCIA_DIREITO' ? (
              <span
                className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800"
                title="Renúncia ao direito — irreversível"
              >
                RENÚNCIA
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
      cell: ({ row }) => {
        const auto =
          row.original.requerConferencia &&
          (row.original.origemCriacao === 'DJEN_AUTO' ||
            row.original.origemCriacao === 'ONBOARDING')
        return (
          <span
            className="block whitespace-nowrap font-mono text-xs text-[var(--color-text-primary)]"
            title={
              auto
                ? 'Processo criado automaticamente pelo DJEN. Verifique e complete os dados.'
                : undefined
            }
          >
            {row.original.numero}
          </span>
        )
      },
    },
    {
      id: 'clienteNome',
      header: 'Cliente',
      size: 200,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.clienteNome ?? '—'}</span>
      ),
    },
    {
      id: 'materia',
      header: 'Matéria',
      size: 150,
      cell: ({ row }) => (
        <span className="block truncate text-sm">{row.original.materia?.trim() || '—'}</span>
      ),
    },
    {
      id: 'parceiro',
      header: 'Parceiro',
      size: 120,
      cell: ({ row }) => {
        const nome = row.original.parceiroNome?.trim()
        const cor = row.original.parceiroCorHex
        if (!nome) {
          return <span className="text-sm text-[var(--color-text-secondary)]">—</span>
        }
        return (
          <span className="flex items-center gap-1.5 truncate text-sm">
            {cor ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--color-border-default)]"
                style={{ backgroundColor: cor }}
                aria-hidden
              />
            ) : null}
            {nome}
          </span>
        )
      },
    },
    {
      id: 'login',
      header: 'Login',
      size: 110,
      cell: ({ row }) => (
        <span className="block truncate text-sm" title={row.original.login ?? undefined}>
          {row.original.advogadoNome ?? row.original.login ?? '—'}
        </span>
      ),
    },
    {
      id: 'qualidadeCaso',
      header: 'Situação',
      size: 170,
      cell: ({ row }) => (
        <span
          className="flex items-center gap-1 truncate text-sm"
          title={
            row.original.alertaCrVara
              ? 'Esta vara exige tipo específico de comprovante de residência. Verifique no modal.'
              : undefined
          }
        >
          {row.original.alertaCrVara ? (
            <span className="shrink-0 text-orange-500" aria-hidden>
              ⚠
            </span>
          ) : null}
          {row.original.qualidadeCaso?.trim() || '—'}
        </span>
      ),
    },
    {
      id: 'faseAtual',
      header: 'Fase atual',
      size: 160,
      cell: ({ row }) => (
        <span className="block truncate text-sm text-[var(--color-text-primary)]">
          {faseLabel(row.original.faseAtual)}
        </span>
      ),
    },
    {
      id: 'ultimaSentencaResultado',
      header: 'Sentença',
      size: 130,
      cell: ({ row }) => (
        <span className="block truncate text-sm">
          {row.original.ultimaSentencaResultado?.trim() || '—'}
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
              style={
                row.original.requerConferencia
                  ? undefined
                  : rowTintStyle(row.original.parceiroCorHex)
              }
              className={`cursor-pointer ${
                row.original.requerConferencia
                  ? 'bg-[var(--urgencia-atencao-bg)]/45 hover:bg-[var(--urgencia-atencao-bg)]/70'
                  : 'hover:bg-[var(--color-bg-hover)]'
              } ${
                row.original.alertaCrVara ? 'border-l-4 border-l-orange-400' : ''
              } ${
                row.original.litiganciaMaFe ? 'border-l-4 border-l-red-500' : ''
              }`}
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
