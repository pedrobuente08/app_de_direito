'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { PopUpHabilitacaoAdversaria } from '@/components/popups'
import { Btn } from '@/components/ui/btn'
import { NotificacoesBell } from '@/components/notificacoes/notificacoes-bell'
import { getAuthMe } from '@/lib/api'
import { LogoutButton } from './logout-button'
import {
  labelForPath,
  navSectionsForPerfil,
  atendimentoAllowedPath,
  pautistaAllowedPath,
} from './_config/nav'

function iniciaisDeNome(nome: string | null | undefined, email: string | null): string {
  if (nome?.trim()) {
    const parts = nome.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
    return nome.slice(0, 2).toUpperCase()
  }
  if (!email) return 'U'
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return local.slice(0, 2).toUpperCase() || 'U'
}

function primeiroNome(nome: string | null | undefined, email: string | null): string {
  if (nome?.trim()) return nome.trim().split(/\s+/)[0] ?? nome
  if (email) return email.split('@')[0] ?? 'Usuário'
  return 'Usuário'
}

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [nome, setNome] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<string | null>(null)
  const [habilitacaoOpen, setHabilitacaoOpen] = useState(false)

  const navSections = navSectionsForPerfil(perfil ?? undefined)
  const isPainel = pathname === '/painel'
  const shellRestrito = perfil === 'pautista' || perfil === 'atendimento'
  const pageLabel = labelForPath(pathname)

  useEffect(() => {
    let cancelled = false
    getAuthMe()
      .then((me) => {
        if (!cancelled) {
          setEmail(me.email)
          setNome(me.nome ?? null)
          setPerfil(me.perfil)
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
    if (perfil === 'atendimento' && !atendimentoAllowedPath(pathname)) {
      router.replace('/pendencias')
    }
    if (perfil === 'pautista' && !pautistaAllowedPath(pathname)) {
      router.replace('/agenda')
    }
  }, [perfil, pathname, router])

  return (
    <div
      className="grid h-screen overflow-hidden bg-pauta-paper"
      style={{ gridTemplateColumns: 'var(--sidebar-width) 1fr' }}
    >
      {/* Sidebar Pauta */}
      <aside className="relative flex flex-col overflow-hidden bg-pauta-forest-deep px-[22px] pb-[26px] pt-[30px] text-[#E9E4D6]">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[-120px] h-[300px]"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 100%, rgba(157,179,164,0.18), transparent 70%)',
          }}
          aria-hidden
        />

        <div className="relative z-[2] mb-[42px] flex items-center gap-[11px]">
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-pauta-sm border-[1.5px] border-pauta-sage">
            <span className="font-display text-[19px] font-semibold leading-none text-[#EFE9DB]">
              P
            </span>
          </div>
          <h1 className="font-display text-[23px] font-semibold tracking-[0.3px] text-[#F3EEE1]">
            Pauta<span className="text-pauta-ochre">.</span>
          </h1>
        </div>

        <nav className="relative z-[2] flex-1 overflow-y-auto overflow-x-hidden">
          {navSections.map((section) => (
            <div key={section.label} className="mb-2">
              <p className="mb-3 mt-1.5 px-1 font-mono text-[10.5px] uppercase tracking-[1.6px] text-[#7E9085]">
                {section.label}
              </p>
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative mb-[3px] flex items-center gap-3 rounded-pauta-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[rgba(157,179,164,0.16)] text-[#F4EFE2]'
                        : 'text-[#C5C8B9] hover:bg-white/5 hover:text-[#F4EFE2]'
                    }`}
                  >
                    {active ? (
                      <span
                        className="absolute bottom-[9px] left-[-22px] top-[9px] w-[3px] rounded-r-sm bg-pauta-ochre"
                        aria-hidden
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 ? (
                      <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px]">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {!shellRestrito ? (
          <div className="relative z-[2] mt-4 rounded-pauta-lg border border-[rgba(157,179,164,0.25)] bg-white/[0.025] p-[14px]">
            <p className="mb-1.5 text-xs font-medium text-pauta-sage">Uso de IA · maio</p>
            <div className="mb-2 h-[6px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: '64%',
                  background: 'linear-gradient(90deg, var(--sage), var(--ochre))',
                }}
              />
            </div>
            <p className="font-mono text-[11px] text-[#B9BBAB]">1.420 / 2.200 resumos</p>
          </div>
        ) : null}

        <div className="relative z-[2] mt-[18px]">
          <div className="mb-3 flex items-center gap-[11px]">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[15px] font-semibold text-[#EFE9DB]"
              style={{ background: 'linear-gradient(150deg, #3A6B54, #1C4435)' }}
            >
              {iniciaisDeNome(nome, email)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-[#EDE8DA]">
                {nome ?? primeiroNome(nome, email)}
              </p>
              <p className="truncate text-[11.5px] text-[#8A9890]">{email ?? '…'}</p>
            </div>
          </div>
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-pauta-paper">
        {!isPainel ? (
          <header className="flex shrink-0 items-center gap-3 border-b border-pauta-line bg-pauta-card px-[38px] py-3">
            <p className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-[1.2px] text-pauta-muted">
              Início&nbsp;/&nbsp;<span className="text-pauta-ink">{pageLabel}</span>
            </p>

            {!shellRestrito ? (
              <>
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
                <NotificacoesBell />
              </>
            ) : null}
          </header>
        ) : null}

        <main
          className={`min-h-0 flex-1 overflow-y-auto animate-fade-in-up ${
            isPainel ? '' : 'p-6'
          }`}
        >
          {children}
        </main>
      </div>

      {!shellRestrito ? (
        <PopUpHabilitacaoAdversaria
          open={habilitacaoOpen}
          onClose={() => setHabilitacaoOpen(false)}
          onSuccess={() => setHabilitacaoOpen(false)}
        />
      ) : null}
    </div>
  )
}
