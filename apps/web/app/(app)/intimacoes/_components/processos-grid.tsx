'use client'

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { patchProcesso } from '@/lib/api'
import { mergeSentencaOpcoes } from '@/lib/sentenca-opcoes'
import type {
  DropdownsProcessoConfig,
  PatchProcessoPayload,
  Processo,
} from '@/lib/types'

type ToastApi = {
  success: (msg: string) => void
  error: (msg: string) => void
}

function dateInputValue(v: string | null | undefined): string {
  if (v == null || String(v).trim() === '') return ''
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return ''
}

function timeInputValue(v: string | null | undefined): string {
  if (v == null || String(v).trim() === '') return ''
  const m = /^(\d{2}:\d{2})/.exec(String(v).trim())
  return m ? m[1] : ''
}

function normalizeValorSentenca(raw: string): string | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(t)) {
    throw new Error('Valor da sentença: use número com até 2 decimais (ex.: 1500 ou 1500.50).')
  }
  return t
}

function EditableText({
  value,
  onCommit,
  toast,
  disabled,
  monospace,
}: {
  value: string | null | undefined
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
  disabled?: boolean
  monospace?: boolean
}) {
  const [local, setLocal] = useState(() => value ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocal(value ?? '')
  }, [value])

  async function commit() {
    const trimmed = local.trim()
    const nextVal = trimmed === '' ? null : trimmed
    const prevVal =
      value == null || String(value).trim() === ''
        ? null
        : String(value).trim()
    if (nextVal === prevVal) return
    setSaving(true)
    try {
      await onCommit(nextVal)
    } catch (e) {
      toast.error((e as Error).message)
      setLocal(value ?? '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      type="text"
      disabled={disabled || saving}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className={`min-h-[32px] w-full min-w-[72px] rounded border border-transparent bg-[var(--color-bg-subtle)] px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60 ${monospace ? 'font-mono text-xs' : ''}`}
    />
  )
}

function EditableSelect({
  value,
  options,
  onCommit,
  toast,
}: {
  value: string | null | undefined
  options: string[]
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
}) {
  const mergedOptions = useMemo(() => {
    const v = (value ?? '').trim()
    const base = [...options]
    if (v && !base.includes(v)) {
      base.push(v)
    }
    return base
  }, [options, value])

  const [local, setLocal] = useState(() => value ?? '')
  useEffect(() => {
    setLocal(value ?? '')
  }, [value])

  async function apply(nextRaw: string) {
    const nextVal = nextRaw.trim() === '' ? null : nextRaw.trim()
    const prevVal =
      value == null || String(value).trim() === ''
        ? null
        : String(value).trim()
    if (nextVal === prevVal) {
      return
    }
    try {
      await onCommit(nextVal)
    } catch (e) {
      toast.error((e as Error).message)
      setLocal(value ?? '')
    }
  }

  return (
    <select
      value={local}
      onChange={(e) => {
        const next = e.target.value
        setLocal(next)
        void apply(next)
      }}
      className="min-h-[32px] w-full min-w-[100px] max-w-[220px] rounded border border-transparent bg-[var(--color-bg-subtle)] px-1 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60"
    >
      <option value="">—</option>
      {mergedOptions.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function EditableDate({
  value,
  onCommit,
  toast,
  disabled,
}: {
  value: string | null | undefined
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
  disabled?: boolean
}) {
  const iso = dateInputValue(value)
  const [local, setLocal] = useState(iso)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocal(dateInputValue(value))
  }, [value])

  async function commit() {
    const next = local.trim() === '' ? null : local.slice(0, 10)
    const prev = dateInputValue(value) || null
    if (next === prev) return
    setSaving(true)
    try {
      await onCommit(next)
    } catch (e) {
      toast.error((e as Error).message)
      setLocal(dateInputValue(value))
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      type="date"
      disabled={disabled || saving}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      className="min-h-[32px] w-full min-w-[128px] rounded border border-transparent bg-[var(--color-bg-subtle)] px-1 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60"
    />
  )
}

function EditableTime({
  value,
  onCommit,
  toast,
  disabled,
}: {
  value: string | null | undefined
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
  disabled?: boolean
}) {
  const t0 = timeInputValue(value)
  const [local, setLocal] = useState(t0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocal(timeInputValue(value))
  }, [value])

  async function commit() {
    const next = local.trim() === '' ? null : local.slice(0, 5)
    const prev = timeInputValue(value) || null
    if (next === prev) return
    setSaving(true)
    try {
      await onCommit(next)
    } catch (e) {
      toast.error((e as Error).message)
      setLocal(timeInputValue(value))
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      type="time"
      disabled={disabled || saving}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      className="min-h-[32px] w-full min-w-[96px] rounded border border-transparent bg-[var(--color-bg-subtle)] px-1 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60"
    />
  )
}

function EditableValor({
  value,
  onCommit,
  toast,
  disabled,
}: {
  value: string | null | undefined
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
  disabled?: boolean
}) {
  const [local, setLocal] = useState(() => (value != null ? String(value) : ''))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocal(value != null ? String(value) : '')
  }, [value])

  async function commit() {
    let next: string | null
    try {
      next = normalizeValorSentenca(local)
    } catch (err) {
      toast.error((err as Error).message)
      setLocal(value != null ? String(value) : '')
      return
    }
    const prev =
      value == null || String(value).trim() === ''
        ? null
        : normalizeValorSentenca(String(value))
    if (next === prev) return
    setSaving(true)
    try {
      await onCommit(next)
    } catch (e) {
      toast.error((e as Error).message)
      setLocal(value != null ? String(value) : '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled || saving}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      placeholder="0.00"
      className="min-h-[32px] w-full min-w-[88px] rounded border border-transparent bg-[var(--color-bg-subtle)] px-2 py-1 font-mono text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60"
    />
  )
}

type Props = {
  data: Processo[]
  onRowUpdated: (row: Processo) => void
  toast: ToastApi
  readOnly?: boolean
  /** Se preenchido em Configurações, usa lista (select) em vez de texto livre. */
  dropdowns?: DropdownsProcessoConfig | null
}

export function ProcessosGrid({
  data,
  onRowUpdated,
  toast,
  readOnly,
  dropdowns,
}: Props) {
  const patch = useCallback(
    async (id: string, payload: PatchProcessoPayload) => {
      const updated = await patchProcesso(id, payload)
      onRowUpdated(updated)
    },
    [onRowUpdated],
  )

  const columns = useMemo<ColumnDef<Processo>[]>(() => {
    const ro = readOnly === true
    const opcoesSentenca = mergeSentencaOpcoes(dropdowns?.sentenca)

    const fieldCol = (
      key: keyof PatchProcessoPayload,
      header: string,
      width: number,
      opts?: { monospace?: boolean; selectOptions?: string[] },
    ): ColumnDef<Processo> => ({
      id: String(key),
      header,
      size: width,
      accessorFn: (row) => row[key as keyof Processo] as string | null | undefined,
      cell: ({ row }) => {
        const raw = row.original[key as keyof Processo] as string | null | undefined
        const optsList = opts?.selectOptions?.filter(Boolean) ?? []
        if (ro) {
          return (
            <span
              style={{ maxWidth: width }}
              className={`block truncate text-sm ${opts?.monospace ? 'font-mono text-xs' : ''}`}
            >
              {raw ?? '—'}
            </span>
          )
        }
        if (optsList.length > 0) {
          return (
            <EditableSelect
              value={raw}
              options={optsList}
              toast={toast}
              onCommit={(v) => patch(row.original.id, { [key]: v } as PatchProcessoPayload)}
            />
          )
        }
        return (
          <EditableText
            monospace={opts?.monospace}
            value={raw}
            toast={toast}
            onCommit={(v) => patch(row.original.id, { [key]: v } as PatchProcessoPayload)}
          />
        )
      },
    })

    return [
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
        id: 'flags',
        header: '',
        size: 88,
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
      fieldCol('clienteNome', 'Cliente', 200),
      fieldCol('clienteCpf', 'CPF', 120, { monospace: true }),
      fieldCol('reuTexto', 'Réu', 200),
      fieldCol('vara', 'Vara', 100),
      fieldCol('materia', 'Matéria', 120),
      fieldCol('sistema', 'Sistema', 90),
      fieldCol('login', 'Login', 100),
      {
        id: 'dataDistribuicao',
        header: 'Dist.',
        size: 132,
        cell: ({ row }) =>
          ro ? (
            <span className="text-xs">{dateInputValue(row.original.dataDistribuicao) || '—'}</span>
          ) : (
            <EditableDate
              value={row.original.dataDistribuicao}
              toast={toast}
              onCommit={(v) => patch(row.original.id, { dataDistribuicao: v })}
            />
          ),
      },
      {
        id: 'dataAudiencia',
        header: 'Aud.',
        size: 132,
        cell: ({ row }) =>
          ro ? (
            <span className="text-xs">{dateInputValue(row.original.dataAudiencia) || '—'}</span>
          ) : (
            <EditableDate
              value={row.original.dataAudiencia}
              toast={toast}
              onCommit={(v) => patch(row.original.id, { dataAudiencia: v })}
            />
          ),
      },
      {
        id: 'horaAudiencia',
        header: 'Hora',
        size: 96,
        cell: ({ row }) =>
          ro ? (
            <span className="text-xs">{timeInputValue(row.original.horaAudiencia) || '—'}</span>
          ) : (
            <EditableTime
              value={row.original.horaAudiencia}
              toast={toast}
              onCommit={(v) => patch(row.original.id, { horaAudiencia: v })}
            />
          ),
      },
      fieldCol('tipoAudiencia', 'Tipo aud.', 90),
      fieldCol('situacao', 'Situação', 110, {
        selectOptions: dropdowns?.situacao,
      }),
      fieldCol('faseAtual', 'Fase', 130, {
        selectOptions: dropdowns?.fase_atual,
      }),
      fieldCol('sentenca', 'Sentença', 168, {
        selectOptions: opcoesSentenca,
      }),
      {
        id: 'dataSentenca',
        header: 'Dt. sent.',
        size: 132,
        cell: ({ row }) =>
          ro ? (
            <span className="text-xs">{dateInputValue(row.original.dataSentenca) || '—'}</span>
          ) : (
            <EditableDate
              value={row.original.dataSentenca}
              toast={toast}
              onCommit={(v) => patch(row.original.id, { dataSentenca: v })}
            />
          ),
      },
      {
        id: 'valorSentenca',
        header: 'Valor sent.',
        size: 104,
        cell: ({ row }) =>
          ro ? (
            <span className="font-mono text-xs">{row.original.valorSentenca ?? '—'}</span>
          ) : (
            <EditableValor
              value={row.original.valorSentenca}
              toast={toast}
              onCommit={(v) => patch(row.original.id, { valorSentenca: v })}
            />
          ),
      },
      fieldCol('recurso', 'Recurso', 100),
      fieldCol('turma', 'Turma', 90),
      fieldCol('acordao', 'Acórdão', 90),
      fieldCol('situacaoFinal', 'Sit. final', 110),
      fieldCol('telefone', 'Telefone', 120),
      fieldCol('statusAudiencia', 'St. aud.', 100),
      fieldCol('ultimaMovimentacaoTipo', 'Últ. mov.', 120),
    ]
  }, [patch, toast, readOnly, dropdowns])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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
            <tr key={row.id} className="hover:bg-[var(--color-bg-hover)]">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border-r border-[var(--color-border-default)] px-2 py-1 align-top last:border-r-0">
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
