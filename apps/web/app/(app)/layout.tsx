'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { LogoutButton } from './logout-button'

const STORAGE_KEY = 'conectar-sidebar-collapsed'

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
      { href: '/agenda', label: 'Agenda' },
      { href: '/ausentes', label: 'Ausentes 6m' },
    ],
  },
  {
    label: 'Execução',
    items: [
      { href: '/procedentes', label: 'Procedentes' },
      { href: '/recursos', label: 'Recursos' },
      { href: '/improcedentes', label: 'Improcedentes' },
    ],
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
      { href: '/reus', label: 'Réus' },
      { href: '/escritorios-adversarios', label: 'Bancas adversárias' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracoes', label: 'Configurações' },
      { href: '/importacao', label: 'Importação' },
      { href: '/migracao-procedentes', label: 'Migração planilha' },
      { href: '/audit-log', label: 'Audit log' },
    ],
  },
]

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  const activeGroupLabel =
    navGroups.find((g) =>
      g.items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/')),
    )?.label ?? null

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroupLabel ? [activeGroupLabel] : []),
  )

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setCollapsed(stored !== '0')
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (activeGroupLabel) {
      setOpenGroups((prev) => new Set(Array.from(prev).concat(activeGroupLabel)))
    }
  }, [activeGroupLabel])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  function toggleGroup(label: string) {
    if (collapsed) {
      setCollapsed(false)
      localStorage.setItem(STORAGE_KEY, '0')
      setOpenGroups(new Set([label]))
      return
    }
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

  const sidebarWidth = collapsed ? 56 : 240

  return (
    <div className="flex min-h-screen">
      <aside
        className="flex shrink-0 flex-col border-r border-[var(--color-border-default)] bg-[var(--color-bg-surface)] transition-[width] duration-200"
        style={{ width: hydrated ? sidebarWidth : 56 }}
      >
        <div className="flex h-[var(--header-height)] items-center justify-between border-b border-[var(--color-border-default)] px-2">
          {!collapsed && (
            <span className="truncate px-2 text-sm font-semibold text-[var(--color-brand-text)]">
              CONECTAR
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="ml-auto rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-1">
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
                  title={group.label}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide transition-colors hover:bg-[var(--color-bg-hover)] ${
                    hasActive
                      ? 'text-[var(--color-brand-text)]'
                      : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  {!collapsed ? (
                    <>
                      {group.label}
                      <span className="text-[10px] opacity-60">{isOpen ? '▾' : '▸'}</span>
                    </>
                  ) : (
                    <span className="mx-auto text-[10px]">{group.label.slice(0, 1)}</span>
                  )}
                </button>

                {(isOpen || collapsed) && (
                  <div className={collapsed ? 'mt-0.5' : 'mt-0.5 pl-1'}>
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={item.label}
                          className={`block rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors ${
                            active
                              ? 'bg-[var(--color-brand-subtle)] font-medium text-[var(--color-brand-text)]'
                              : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                          } ${collapsed ? 'text-center text-xs' : ''}`}
                        >
                          {collapsed ? item.label.slice(0, 2) : item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-[var(--color-border-default)] p-2">
          {!collapsed && <LogoutButton />}
          {collapsed && (
            <div className="flex justify-center">
              <LogoutButton />
            </div>
          )}
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
