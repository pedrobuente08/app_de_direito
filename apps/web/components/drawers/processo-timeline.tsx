'use client'

import type { ProcessoTimelineEvento } from '@/lib/types'

const ICON: Record<ProcessoTimelineEvento['tipo'], string> = {
  distribuicao: '📥',
  audiencia: '🎙️',
  sentenca: '⚖️',
  fase: '📋',
}

function formatData(iso: string): string {
  const d = iso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

type Props = {
  eventos: ProcessoTimelineEvento[]
  loading?: boolean
  error?: string | null
}

export function ProcessoTimeline({ eventos, loading, error }: Props) {
  if (loading) {
    return (
      <p className="text-xs text-[var(--color-text-secondary)]">Carregando timeline…</p>
    )
  }
  if (error) {
    return (
      <p className="text-xs text-[var(--urgencia-vencida-text)]">{error}</p>
    )
  }
  if (!eventos.length) {
    return (
      <p className="text-xs text-[var(--color-text-secondary)]">
        Nenhum evento registrado ainda.
      </p>
    )
  }

  return (
    <ol className="relative space-y-0 border-l border-[var(--color-border-default)] pl-4">
      {eventos.map((ev, i) => (
        <li key={ev.id} className="relative pb-4 last:pb-0">
          <span
            className="absolute -left-[1.35rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[10px]"
            aria-hidden
          >
            {ICON[ev.tipo]}
          </span>
          <p className="text-xs font-medium text-[var(--color-text-primary)]">
            {ev.titulo}
          </p>
          <p className="text-[10px] text-[var(--color-text-tertiary)]">
            {formatData(ev.data)}
          </p>
          {ev.subtitulo ? (
            <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
              {ev.subtitulo}
            </p>
          ) : null}
          {i < eventos.length - 1 ? null : null}
        </li>
      ))}
    </ol>
  )
}
