'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { patchProcesso } from '@/lib/api'
import { mergeSentencaOpcoes } from '@/lib/sentenca-opcoes'
import type { DropdownsProcessoConfig, PatchProcessoPayload, Processo } from '@/lib/types'

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

function EditableSelect({
  value, options, onCommit, toast,
}: {
  value: string | null | undefined
  options: string[]
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
}) {
  const mergedOptions = useMemo(() => {
    const v = (value ?? '').trim()
    const base = [...options]
    if (v && !base.includes(v)) base.push(v)
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
      {mergedOptions.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function EditableDate({
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

function EditableTime({
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

function EditableValor({
  value, onCommit, toast,
}: {
  value: string | null | undefined
  onCommit: (next: string | null) => Promise<void>
  toast: ToastApi
}) {
  const [local, setLocal] = useState(() => (value != null ? String(value) : ''))
  const [saving, setSaving] = useState(false)
  useEffect(() => { setLocal(value != null ? String(value) : '') }, [value])

  async function commit() {
    let next: string | null
    try { next = normalizeValorSentenca(local) } catch (err) {
      toast.error((err as Error).message)
      setLocal(value != null ? String(value) : '')
      return
    }
    const prev = value == null || String(value).trim() === '' ? null : normalizeValorSentenca(String(value))
    if (next === prev) return
    setSaving(true)
    try { await onCommit(next) } catch (e) {
      toast.error((e as Error).message)
      setLocal(value != null ? String(value) : '')
    } finally { setSaving(false) }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={saving}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      placeholder="0.00"
      className="min-h-[32px] w-full rounded border border-transparent bg-[var(--color-bg-subtle)] px-2 py-1 font-mono text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] disabled:opacity-60"
    />
  )
}

function ReadField({ value }: { value: string | null | undefined }) {
  return (
    <span className="flex min-h-[32px] items-center text-sm text-[var(--color-text-primary)]">
      {value ?? '—'}
    </span>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {label}
      </p>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 border-b border-[var(--color-border-default)] pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {children}
      </div>
    </div>
  )
}

type Props = {
  processo: Processo
  onClose: () => void
  onUpdated: (p: Processo) => void
  toast: ToastApi
  readOnly?: boolean
  dropdowns?: DropdownsProcessoConfig | null
}

export function ProcessoModal({ processo, onClose, onUpdated, toast, readOnly, dropdowns }: Props) {
  const [current, setCurrent] = useState<Processo>(processo)
  useEffect(() => { setCurrent(processo) }, [processo])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const patch = useCallback(async (payload: PatchProcessoPayload) => {
    const updated = await patchProcesso(current.id, payload)
    setCurrent(updated)
    onUpdated(updated)
  }, [current.id, onUpdated])

  const ro = readOnly === true
  const opcoesSentenca = useMemo(() => mergeSentencaOpcoes(dropdowns?.sentenca), [dropdowns])
  const situacaoOpts = dropdowns?.situacao ?? []
  const faseOpts = dropdowns?.fase_atual ?? []

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 z-[51] flex min-h-0 w-[min(48rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]"
        style={{
          top: 'calc(var(--header-height) + var(--app-main-padding))',
          bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-6 py-4">
          <div>
            <h2 className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">
              {current.numero}
            </h2>
            {ro && (
              <span className="text-xs text-[var(--color-text-secondary)]">Somente leitura</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 basis-0 space-y-6 overflow-y-auto overscroll-y-contain px-6 py-5 pb-10">
          <Section title="Identificação">
            <Field label="Sistema">
              {ro ? <ReadField value={current.sistema} /> : (
                <EditableText value={current.sistema} toast={toast} onCommit={(v) => patch({ sistema: v })} />
              )}
            </Field>
            <Field label="Login">
              {ro ? <ReadField value={current.login} /> : (
                <EditableText value={current.login} toast={toast} onCommit={(v) => patch({ login: v })} />
              )}
            </Field>
            <Field label="Vara">
              {ro ? <ReadField value={current.vara} /> : (
                <EditableText value={current.vara} toast={toast} onCommit={(v) => patch({ vara: v })} />
              )}
            </Field>
            <Field label="Matéria">
              {ro ? <ReadField value={current.materia} /> : (
                <EditableText value={current.materia} toast={toast} onCommit={(v) => patch({ materia: v })} />
              )}
            </Field>
            <Field label="Situação">
              {ro ? <ReadField value={current.situacao} /> : situacaoOpts.length > 0 ? (
                <EditableSelect value={current.situacao} options={situacaoOpts} toast={toast} onCommit={(v) => patch({ situacao: v })} />
              ) : (
                <EditableText value={current.situacao} toast={toast} onCommit={(v) => patch({ situacao: v })} />
              )}
            </Field>
            <Field label="Fase">
              {ro ? <ReadField value={current.faseAtual} /> : faseOpts.length > 0 ? (
                <EditableSelect value={current.faseAtual} options={faseOpts} toast={toast} onCommit={(v) => patch({ faseAtual: v })} />
              ) : (
                <EditableText value={current.faseAtual} toast={toast} onCommit={(v) => patch({ faseAtual: v })} />
              )}
            </Field>
          </Section>

          <Section title="Partes">
            <Field label="Cliente" className="col-span-2">
              {ro ? <ReadField value={current.clienteNome} /> : (
                <EditableText value={current.clienteNome} toast={toast} onCommit={(v) => patch({ clienteNome: v })} />
              )}
            </Field>
            <Field label="CPF">
              {ro ? <ReadField value={current.clienteCpf} /> : (
                <EditableText value={current.clienteCpf} toast={toast} monospace onCommit={(v) => patch({ clienteCpf: v })} />
              )}
            </Field>
            <Field label="Réu" className="col-span-2 sm:col-span-3">
              {ro ? <ReadField value={current.reuTexto} /> : (
                <EditableText value={current.reuTexto} toast={toast} onCommit={(v) => patch({ reuTexto: v })} />
              )}
            </Field>
          </Section>

          <Section title="Audiência">
            <Field label="Distribuição">
              {ro ? <ReadField value={current.dataDistribuicao} /> : (
                <EditableDate value={current.dataDistribuicao} toast={toast} onCommit={(v) => patch({ dataDistribuicao: v })} />
              )}
            </Field>
            <Field label="Data audiência">
              {ro ? <ReadField value={current.dataAudiencia} /> : (
                <EditableDate value={current.dataAudiencia} toast={toast} onCommit={(v) => patch({ dataAudiencia: v })} />
              )}
            </Field>
            <Field label="Hora">
              {ro ? <ReadField value={current.horaAudiencia} /> : (
                <EditableTime value={current.horaAudiencia} toast={toast} onCommit={(v) => patch({ horaAudiencia: v })} />
              )}
            </Field>
            <Field label="Tipo">
              {ro ? <ReadField value={current.tipoAudiencia} /> : (
                <EditableText value={current.tipoAudiencia} toast={toast} onCommit={(v) => patch({ tipoAudiencia: v })} />
              )}
            </Field>
            <Field label="Status audiência">
              {ro ? <ReadField value={current.statusAudiencia} /> : (
                <EditableText value={current.statusAudiencia} toast={toast} onCommit={(v) => patch({ statusAudiencia: v })} />
              )}
            </Field>
          </Section>

          <Section title="Sentença">
            <Field label="Sentença">
              {ro ? <ReadField value={current.sentenca} /> : opcoesSentenca.filter(Boolean).length > 0 ? (
                <EditableSelect value={current.sentenca} options={opcoesSentenca} toast={toast} onCommit={(v) => patch({ sentenca: v })} />
              ) : (
                <EditableText value={current.sentenca} toast={toast} onCommit={(v) => patch({ sentenca: v })} />
              )}
            </Field>
            <Field label="Data sentença">
              {ro ? <ReadField value={current.dataSentenca} /> : (
                <EditableDate value={current.dataSentenca} toast={toast} onCommit={(v) => patch({ dataSentenca: v })} />
              )}
            </Field>
            <Field label="Valor">
              {ro ? <ReadField value={current.valorSentenca} /> : (
                <EditableValor value={current.valorSentenca} toast={toast} onCommit={(v) => patch({ valorSentenca: v })} />
              )}
            </Field>
            <Field label="Recurso">
              {ro ? <ReadField value={current.recurso} /> : (
                <EditableText value={current.recurso} toast={toast} onCommit={(v) => patch({ recurso: v })} />
              )}
            </Field>
            <Field label="Turma">
              {ro ? <ReadField value={current.turma} /> : (
                <EditableText value={current.turma} toast={toast} onCommit={(v) => patch({ turma: v })} />
              )}
            </Field>
            <Field label="Acórdão">
              {ro ? <ReadField value={current.acordao} /> : (
                <EditableText value={current.acordao} toast={toast} onCommit={(v) => patch({ acordao: v })} />
              )}
            </Field>
            <Field label="Situação final">
              {ro ? <ReadField value={current.situacaoFinal} /> : (
                <EditableText value={current.situacaoFinal} toast={toast} onCommit={(v) => patch({ situacaoFinal: v })} />
              )}
            </Field>
          </Section>

          <Section title="Outros">
            <Field label="Telefone">
              {ro ? <ReadField value={current.telefone} /> : (
                <EditableText value={current.telefone} toast={toast} onCommit={(v) => patch({ telefone: v })} />
              )}
            </Field>
            <Field label="Última movimentação" className="col-span-2">
              {ro ? <ReadField value={current.ultimaMovimentacaoTipo} /> : (
                <EditableText value={current.ultimaMovimentacaoTipo} toast={toast} onCommit={(v) => patch({ ultimaMovimentacaoTipo: v })} />
              )}
            </Field>
          </Section>
        </div>
      </div>
    </>,
    document.body,
  )
}
