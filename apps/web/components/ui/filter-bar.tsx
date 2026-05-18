import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export function FilterBar({ children, className = '' }: Props) {
  return (
    <div
      className={`mb-4 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 ${className}`}
    >
      {children}
    </div>
  )
}

export function FilterField({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-w-[130px] flex-col gap-1 ${className}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {label}
      </label>
      {children}
    </div>
  )
}

export const filterControlClass =
  'min-h-[34px] rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]'
