'use client'

import type { DragEvent, ReactNode } from 'react'

type Props = {
  children: ReactNode
  onFiles?: (files: FileList) => void
  accept?: string
  disabled?: boolean
  className?: string
}

export function ImportZone({
  children,
  onFiles,
  accept,
  disabled = false,
  className = '',
}: Props) {
  function handleDrop(e: DragEvent) {
    e.preventDefault()
    if (disabled || !onFiles || !e.dataTransfer.files.length) return
    onFiles(e.dataTransfer.files)
  }

  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] px-6 py-10 text-center transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] has-[:focus-visible]:border-[var(--color-accent)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-accent)] ${disabled ? 'pointer-events-none opacity-50' : ''} ${className}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        type="file"
        className="sr-only"
        disabled={disabled}
        accept={accept}
        multiple
        onChange={(e) => {
          if (e.target.files?.length && onFiles) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {children}
    </label>
  )
}
