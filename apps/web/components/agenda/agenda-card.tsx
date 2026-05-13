import type { Audiencia } from '@/lib/types'

export function AgendaCard({ audiencia: a }: { audiencia: Audiencia }) {
  const dataBr = a.data?.slice(0, 10)
  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 shadow-sm">
      <p className="font-mono text-xs text-[var(--color-text-primary)]">{a.processo?.numero ?? a.processoId.slice(0, 8)}</p>
      {a.processo?.clienteNome && (
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{a.processo.clienteNome}</p>
      )}
      <p className="mt-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {dataBr} {a.hora ? `· ${a.hora}` : ''}
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{a.tipo ?? 'Audiência'}</p>
    </article>
  )
}
