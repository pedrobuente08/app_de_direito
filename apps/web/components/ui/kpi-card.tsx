'use client'

import type { ReactNode } from 'react'

export type KpiCardVariant = 'default' | 'danger' | 'warning' | 'success' | 'accent'

const valueColor: Record<KpiCardVariant, string> = {
  default: 'text-[var(--color-brand)]',
  danger: 'text-[var(--urgencia-vencida-text)]',
  warning: 'text-[var(--urgencia-atencao-text)]',
  success: 'text-[var(--urgencia-normal-text)]',
  accent: 'text-[var(--color-accent-dark)]',
}

type Props = {
  label: string
  value: ReactNode
  foot?: ReactNode
  variant?: KpiCardVariant
  onClick?: () => void
  className?: string
}

export function KpiCard({
  label,
  value,
  foot,
  variant = 'default',
  onClick,
  className = '',
}: Props) {
  const base =
    'w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]'

  const inner = (
    <>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        {label}
      </p>
      <p className={`text-[1.75rem] font-extrabold leading-none ${valueColor[variant]}`}>
        {value}
      </p>
      {foot ? (
        <p className="mt-2 text-[0.7rem] text-[var(--color-text-tertiary)]">{foot}</p>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${className}`}>
        {inner}
      </button>
    )
  }

  return <div className={`${base} ${className}`}>{inner}</div>
}
