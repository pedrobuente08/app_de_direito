'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type DashTab = { href: string; label: string; exact?: boolean }

const TABS: DashTab[] = [
  { href: '/dashboards', label: 'Geral', exact: true },
  { href: '/dashboards/varas', label: 'Varas & Teses' },
  { href: '/dashboards/audiencias', label: 'Audiências' },
  { href: '/dashboards/pendencias', label: 'Pendências' },
  { href: '/dashboards/recursos', label: 'Recursos' },
  { href: '/dashboards/improcedentes', label: 'Improcedentes' },
  { href: '/dashboards/financeiro', label: 'Financeiro' },
]

export function DashNav() {
  const pathname = usePathname()

  return (
    <nav
      className="mb-5 flex flex-wrap gap-1 border-b border-[var(--color-border-default)]"
      aria-label="Dashboards"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative -mb-px rounded-t-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
              active
                ? 'border border-b-0 border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-brand)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
