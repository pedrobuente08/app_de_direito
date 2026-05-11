'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { LogoutButton } from './logout-button'

const navGroups = [
  {
    label: 'Captação',
    items: [
      { href: '/intimacoes', label: 'Intimações' },
      { href: '/revisoes', label: 'Revisões' },
      { href: '/comunicacoes', label: 'Comunicações' },
    ],
  },
  {
    label: 'Acompanhamento',
    items: [
      { href: '/pendencias', label: 'Pendências' },
      { href: '/audiencias', label: 'Audiências' },
    ],
  },
  {
    label: 'Execução',
    items: [{ href: '/procedentes', label: 'Procedentes' }],
  },
  {
    label: 'Análise',
    items: [{ href: '/dashboards', label: 'Dashboards' }],
  },
  {
    label: 'Cadastros',
    items: [
      { href: '/usuarios', label: 'Usuários' },
      { href: '/comarcas', label: 'Comarcas' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracoes', label: 'Configurações' },
      { href: '/importacao', label: 'Importação' },
    ],
  },
]

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const activeGroupLabel =
    navGroups.find((g) =>
      g.items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/')),
    )?.label ?? null

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroupLabel ? [activeGroupLabel] : []),
  )

  useEffect(() => {
    if (activeGroupLabel) {
      setOpenGroups((prev) => new Set(Array.from(prev).concat(activeGroupLabel)))
    }
  }, [activeGroupLabel])

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="flex shrink-0 flex-col border-r border-[var(--color-border-default)] bg-[var(--color-bg-surface)]"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="flex h-[var(--header-height)] items-center border-b border-[var(--color-border-default)] px-4">
          <span className="text-sm font-semibold text-[var(--color-brand-text)]">CONECTAR</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {navGroups.map((group) => {
            const isOpen = openGroups.has(group.label)
            const hasActive = group.items.some(
              (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
            )

            return (
              <div key={group.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide transition-colors hover:bg-[var(--color-bg-hover)] ${
                    hasActive
                      ? 'text-[var(--color-brand-text)]'
                      : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  {group.label}
                  <span className="text-[10px] opacity-60">{isOpen ? '▾' : '▸'}</span>
                </button>

                {isOpen && (
                  <div className="mt-0.5 pl-2">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`block rounded-[var(--radius-sm)] px-3 py-1.5 text-sm transition-colors ${
                            active
                              ? 'bg-[var(--color-brand-subtle)] font-medium text-[var(--color-brand-text)]'
                              : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                          }`}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-[var(--color-border-default)] p-3">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[var(--header-height)] items-center border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6">
          <span className="text-sm text-[var(--color-text-secondary)]">Área logada</span>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
