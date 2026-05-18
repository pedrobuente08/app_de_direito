'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { PopUpHabilitacaoAdversaria } from '@/components/popups'
import { Btn } from '@/components/ui/btn'
import { getAuthMe } from '@/lib/api'
import { LogoutButton } from './logout-button'
import {
  labelForPath,
  navSectionsForPerfil,
  telemarketingAllowedPath,
} from './_config/nav'

function iniciaisDeEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase() || 'U'
}

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<string | null>(null)
  const [escritorioNome, setEscritorioNome] = useState('Escritório')
  const [habilitacaoOpen, setHabilitacaoOpen] = useState(false)

  const navSections = navSectionsForPerfil(perfil ?? undefined)

  useEffect(() => {
    let cancelled = false
    getAuthMe()
      .then((me) => {
        if (!cancelled) {
          setEmail(me.email)
          setPerfil(me.perfil)
          setEscritorioNome('CONECTAR')
        }
      })
      .catch(() => {
        if (!cancelled) setEmail(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (perfil === 'telemarketing' && !telemarketingAllowedPath(pathname)) {
      router.replace('/telemarketing')
    }
  }, [perfil, pathname, router])

  const pageLabel = labelForPath(pathname)

  return (
    <div
      className="grid h-screen overflow-hidden bg-[var(--color-bg-app)]"
      style={{
        gridTemplateColumns: 'var(--sidebar-width) 1fr',
        gridTemplateRows: 'var(--header-height) 1fr',
      }}
    >
      <aside
        className="row-span-2 flex flex-col border-r border-white/5 bg-[var(--color-brand)] text-white"
        style={{ gridColumn: 1, gridRow: '1 / 3' }}
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)] text-sm font-extrabold text-[var(--color-brand)]"
            aria-hidden
          >
            C
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold tracking-tight">CONECTAR</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)]">
              LEAN · M0
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {navSections.map((section) => (
            <div key={section.label} className="mb-1">
              <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
                {section.label}
              </p>
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mx-2 mb-0.5 flex items-center gap-2 rounded-md px-3.5 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-[var(--color-accent)] font-semibold text-[var(--color-brand)]'
                        : 'text-white/75 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 ? (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          active
                            ? 'bg-[var(--color-brand)]/15 text-[var(--color-brand)]'
                            : 'bg-white/15 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      <header
        className="flex items-center gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6"
        style={{ gridColumn: 2, gridRow: 1 }}
      >
        <h1 className="min-w-0 flex-1 text-lg font-bold text-[var(--color-text-primary)]">
          <span className="font-normal text-[var(--color-text-tertiary)]">
            {escritorioNome} /
          </span>{' '}
          {pageLabel}
        </h1>

        <Btn
          variant="default"
          className="hidden shrink-0 sm:inline-flex"
          onClick={() => setHabilitacaoOpen(true)}
        >
          + Habilitação adversária
        </Btn>
        <Btn
          variant="primary"
          className="shrink-0"
          onClick={() => router.push('/importacao')}
        >
          + Importar PDF
        </Btn>

        <button
          type="button"
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-bg-hover)]"
          title="Notificações"
          aria-label="Notificações"
        >
          <span className="text-lg" aria-hidden>
            🔔
          </span>
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--color-bg-surface)]" />
        </button>

        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-[var(--color-brand)]"
          title={email ?? 'Usuário'}
        >
          {email ? iniciaisDeEmail(email) : '…'}
        </span>
      </header>

      <main
        className="min-h-0 overflow-y-auto p-6 animate-fade-in-up"
        style={{ gridColumn: 2, gridRow: 2 }}
      >
        {children}
      </main>

      <PopUpHabilitacaoAdversaria
        open={habilitacaoOpen}
        onClose={() => setHabilitacaoOpen(false)}
        onSuccess={() => setHabilitacaoOpen(false)}
      />
    </div>
  )
}
