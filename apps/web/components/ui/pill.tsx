import type { ReactNode } from 'react'

export type PillVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const styles: Record<PillVariant, string> = {
  success:
    'border-[var(--urgencia-normal-border)] bg-[var(--urgencia-normal-bg)] text-[var(--urgencia-normal-text)]',
  warning:
    'border-[var(--urgencia-atencao-border)] bg-[var(--urgencia-atencao-bg)] text-[var(--urgencia-atencao-text)]',
  danger:
    'border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)]',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  neutral:
    'border-[var(--color-border-default)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]',
}

type Props = {
  children: ReactNode
  variant?: PillVariant
  className?: string
}

export function Pill({ children, variant = 'neutral', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
