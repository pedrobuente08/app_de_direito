'use client'

type Tab = {
  id: string
  label: string
  count?: number
}

type Props = {
  tabs: Tab[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function FamiliaTabs({ tabs, activeId, onChange, className = '' }: Props) {
  return (
    <div
      className={`mb-4 flex flex-wrap gap-1 border-b border-[var(--color-border-default)] ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`relative -mb-px rounded-t-[var(--radius-md)] px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border border-b-0 border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-brand)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tab.label}
            {tab.count != null ? (
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  active
                    ? 'bg-[var(--color-accent)] text-[var(--color-brand)]'
                    : 'bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)]'
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
