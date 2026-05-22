'use client'

import { useEffect, useMemo, useState } from 'react'

export type ToastApi = {
  success: (msg: string) => void
  error: (msg: string) => void
}

export function dateInputValue(v: string | null | undefined): string {
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

export function EditableText({
  value, onCommit, toast, disabled, monospace,
}: {
  value: string | null | undefined
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
  disabled?: boolean
  monospace?: boolean
}) {
  const [local, setLocal] = useState(() => value ?? '')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setLocal(value ?? '') }, [value])

  async function commit() {
    const trimmed = local.trim()
    const nextVal = trimmed === '' ? null : trimmed
    const prevVal = value == null || String(value).trim() === '' ? null : String(value).trim()
    if (nextVal === prevVal) return
    setSaving(true)
    try { await onCommit(nextVal) } catch (e) {
      toast.error((e as Error).message)
      setLocal(value ?? '')
    } finally { setSaving(false) }
  }

  return (
    <input
      type="text"
      disabled={disabled || saving}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className={`min-h-[32px] w-full rounded border border-transparent bg-[var(--color-bg-subtle)] px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60 ${monospace ? 'font-mono text-xs' : ''}`}
    />
  )
}

export function EditableTextarea({
  value, onCommit, toast, disabled, rows = 4,
}: {
  value: string | null | undefined
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
  disabled?: boolean
  rows?: number
}) {
  const [local, setLocal] = useState(() => value ?? '')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setLocal(value ?? '') }, [value])

  async function commit() {
    const trimmed = local.trim()
    const nextVal = trimmed === '' ? null : trimmed
    const prevVal = value == null || String(value).trim() === '' ? null : String(value).trim()
    if (nextVal === prevVal) return
    setSaving(true)
    try { await onCommit(nextVal) } catch (e) {
      toast.error((e as Error).message)
      setLocal(value ?? '')
    } finally { setSaving(false) }
  }

  return (
    <textarea
      rows={rows}
      disabled={disabled || saving}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      className="w-full resize-y rounded border border-transparent bg-[var(--color-bg-subtle)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60"
    />
  )
}

export type SelectOption = string | { value: string; label: string }

function resolveSelectOptions(options: SelectOption[]): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  const seen = new Set<string>()
  for (const o of options) {
    const row =
      typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label }
    const v = row.value.trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push({ value: v, label: row.label })
  }
  return out
}

export function EditableSelect({
  value, options, onCommit, toast,
}: {
  value: string | null | undefined
  options: SelectOption[]
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
}) {
  const mergedOptions = useMemo(() => {
    const v = (value ?? '').trim()
    const base = resolveSelectOptions(options)
    if (v && !base.some((o) => o.value === v)) {
      base.push({ value: v, label: v })
    }
    return base
  }, [options, value])

  const [local, setLocal] = useState(() => value ?? '')
  useEffect(() => { setLocal(value ?? '') }, [value])

  async function apply(nextRaw: string) {
    const nextVal = nextRaw.trim() === '' ? null : nextRaw.trim()
    const prevVal = value == null || String(value).trim() === '' ? null : String(value).trim()
    if (nextVal === prevVal) return
    try { await onCommit(nextVal) } catch (e) {
      toast.error((e as Error).message)
      setLocal(value ?? '')
    }
  }

  return (
    <select
      value={local}
      onChange={(e) => { const next = e.target.value; setLocal(next); void apply(next) }}
      className="min-h-[32px] w-full rounded border border-transparent bg-[var(--color-bg-subtle)] px-1 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]"
    >
      <option value="">—</option>
      {mergedOptions.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function EditableDate({
  value, onCommit, toast,
}: {
  value: string | null | undefined
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
}) {
  const [local, setLocal] = useState(() => dateInputValue(value))
  const [saving, setSaving] = useState(false)
  useEffect(() => { setLocal(dateInputValue(value)) }, [value])

  async function commit() {
    const next = local.trim() === '' ? null : local.slice(0, 10)
    const prev = dateInputValue(value) || null
    if (next === prev) return
    setSaving(true)
    try { await onCommit(next) } catch (e) {
      toast.error((e as Error).message)
      setLocal(dateInputValue(value))
    } finally { setSaving(false) }
  }

  return (
    <input
      type="date"
      disabled={saving}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      className="min-h-[32px] w-full rounded border border-transparent bg-[var(--color-bg-subtle)] px-1 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60"
    />
  )
}

export function EditableTime({
  value, onCommit, toast,
}: {
  value: string | null | undefined
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
}) {
  const [local, setLocal] = useState(() => timeInputValue(value))
  const [saving, setSaving] = useState(false)
  useEffect(() => { setLocal(timeInputValue(value)) }, [value])

  async function commit() {
    const next = local.trim() === '' ? null : local.slice(0, 5)
    const prev = timeInputValue(value) || null
    if (next === prev) return
    setSaving(true)
    try { await onCommit(next) } catch (e) {
      toast.error((e as Error).message)
      setLocal(timeInputValue(value))
    } finally { setSaving(false) }
  }

  return (
    <input
      type="time"
      disabled={saving}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      className="min-h-[32px] w-full rounded border border-transparent bg-[var(--color-bg-subtle)] px-1 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60"
    />
  )
}

export function ReadField({ value }: { value: string | null | undefined }) {
  return (
    <span className="flex min-h-[32px] items-center text-sm text-[var(--color-text-primary)]">
      {value ?? '—'}
    </span>
  )
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {label}
      </p>
      {children}
    </div>
  )
}
