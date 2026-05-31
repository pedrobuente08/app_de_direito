'use client'

import type { ReactNode } from 'react'

export type KpiCardVariant = 'default' | 'danger' | 'warning' | 'success' | 'accent' | 'up' | 'warn' | 'ochre'

const valueColor: Record<KpiCardVariant, string> = {
  default: 'text-pauta-ink',
  danger: 'text-pauta-clay',
  warning: 'text-[var(--delta-warn-text)]',
  success: 'text-pauta-pos',
  accent: 'text-pauta-ochre',
  up: 'text-pauta-ink',
  warn: 'text-pauta-clay',
  ochre: 'text-pauta-ink',
}

const deltaStyles: Record<string, string> = {
  up: 'text-pauta-pos bg-pauta-pos-bg',
  warn: 'text-pauta-clay bg-[var(--delta-crit-bg)]',
  ochre: 'text-[var(--delta-warn-text)] bg-[var(--delta-warn-bg)]',
}

type Props = {
  label: string
  value: ReactNode
  foot?: ReactNode
  delta?: ReactNode
  deltaType?: 'up' | 'warn' | 'ochre'
  variant?: KpiCardVariant
  icon?: ReactNode
  onClick?: () => void
  className?: string
}

export function KpiCard({
  label,
  value,
  foot,
  delta,
  deltaType,
  variant = 'default',
  icon,
  onClick,
  className = '',
}: Props) {
  const base =
    'relative w-full overflow-hidden rounded-pauta-xl border border-pauta-line bg-pauta-card px-[19px] py-[18px] text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-pauta-sm'

  const inner = (
    <>
      <p className="flex items-center gap-[7px] text-[12.5px] font-medium text-pauta-muted">
        {icon ? <span className="text-pauta-forest-2 opacity-90">{icon}</span> : null}
        {label}
      </p>
      <p className={`mt-[13px] font-mono text-[32px] font-medium leading-none tracking-[-1px] ${valueColor[variant]}`}>
        {value}
      </p>
      {delta || foot ? (
        <div className="mt-[11px] flex items-center gap-[7px] text-xs">
          {delta && deltaType ? (
            <span className={`rounded-md px-[7px] py-[2px] font-mono text-[11.5px] font-medium ${deltaStyles[deltaType] ?? deltaStyles.up}`}>
              {delta}
            </span>
          ) : null}
          {foot ? <span className="text-pauta-muted">{foot}</span> : null}
        </div>
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
