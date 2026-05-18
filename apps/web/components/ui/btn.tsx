'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type BtnVariant = 'default' | 'primary' | 'danger'

const variants: Record<BtnVariant, string> = {
  default:
    'border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
  primary:
    'border border-[var(--color-accent-dark)] bg-[var(--color-accent)] text-[var(--color-brand)] hover:bg-[var(--color-accent-dark)] hover:text-white',
  danger:
    'border border-[var(--urgencia-vencida-border)] bg-[var(--urgencia-vencida-bg)] text-[var(--urgencia-vencida-text)] hover:opacity-90',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant
  loading?: boolean
  children: ReactNode
}

export function Btn({
  variant = 'default',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: Props) {
  const isDisabled = disabled || loading

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  )
}
