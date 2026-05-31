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

/** Segmented control estilo Pauta (substitui tabs com borda inferior). */
export function FamiliaTabs({ tabs, activeId, onChange, className = '' }: Props) {
  return (
    <div
      className={`inline-flex rounded-pauta-md border border-pauta-line bg-pauta-card-2 p-[3px] ${className}`}
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
            className={`rounded-[7px] px-[15px] py-[7px] text-[12.5px] font-semibold transition-all ${
              active
                ? 'bg-pauta-card text-pauta-ink shadow-pauta-xs'
                : 'text-pauta-muted hover:text-pauta-ink-soft'
            }`}
          >
            {tab.label}
            {tab.count != null ? (
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                  active
                    ? 'bg-pauta-paper-2 text-pauta-forest-2'
                    : 'bg-pauta-paper text-pauta-muted'
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
