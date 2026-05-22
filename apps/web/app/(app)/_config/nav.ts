export type NavItem = {
  href: string
  label: string
  badge?: number
}

export type NavSection = {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operacional',
    items: [
      { href: '/intimacoes', label: 'INTIMAÇÕES' },
      { href: '/procedentes', label: 'PROCEDENTES' },
      { href: '/recursos', label: 'RECURSOS' },
      { href: '/improcedentes', label: 'IMPROCEDENTES' },
      { href: '/reprotocolo', label: 'REPROTOCOLO' },
      { href: '/agenda', label: 'AGENDA' },
      { href: '/pendencias', label: 'PENDÊNCIAS' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/importacao', label: 'Importação PDF' },
      { href: '/atendimento', label: 'Atendimento' },
      { href: '/comunicacoes', label: 'Comunicações Órfãs' },
    ],
  },
  {
    label: 'Inteligência',
    items: [{ href: '/dashboards', label: 'Dashboards' }],
  },
  {
    label: 'Admin',
    items: [
      { href: '/reus', label: 'Réus canônicos' },
      { href: '/bancas', label: 'Bancas adversárias' },
      { href: '/configuracoes', label: 'Configurações' },
    ],
  },
]

/** Rótulo da aba atual para breadcrumb (mais específico primeiro). */
export const ROUTE_LABELS: Record<string, string> = {
  '/intimacoes': 'Intimações',
  '/procedentes': 'Procedentes',
  '/recursos': 'Recursos',
  '/improcedentes': 'Improcedentes',
  '/reprotocolo': 'Reprotocolo',
  '/agenda': 'Agenda',
  '/pendencias': 'Pendências',
  '/importacao': 'Importação PDF',
  '/atendimento': 'Atendimento',
  '/comunicacoes': 'Comunicações Órfãs',
  '/dashboards': 'Dashboards',
  '/dashboards/varas': 'Varas & Teses',
  '/dashboards/audiencias': 'Audiências',
  '/dashboards/pendencias': 'Pendências',
  '/dashboards/recursos': 'Recursos',
  '/dashboards/improcedentes': 'Improcedentes',
  '/dashboards/financeiro': 'Financeiro',
  '/reus': 'Réus canônicos',
  '/bancas': 'Bancas adversárias',
  '/configuracoes': 'Configurações',
  '/ausentes': 'Ausentes 6m',
  '/audit-log': 'Audit log',
  '/migracao-procedentes': 'Migração planilha',
}

const ATENDIMENTO_HREFS = new Set(['/pendencias', '/atendimento'])

export function navSectionsForPerfil(perfil: string | undefined): NavSection[] {
  if (perfil === 'atendimento') {
    return [
      {
        label: 'Operacional',
        items: NAV_SECTIONS.flatMap((s) => s.items).filter((i) =>
          ATENDIMENTO_HREFS.has(i.href),
        ),
      },
    ]
  }
  return NAV_SECTIONS
}

export function atendimentoAllowedPath(pathname: string): boolean {
  return (
    pathname === '/pendencias' || pathname.startsWith('/pendencias/') ||
    pathname === '/atendimento' || pathname.startsWith('/atendimento/')
  )
}

export function labelForPath(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  const match = Object.keys(ROUTE_LABELS)
    .filter((p) => p !== '/' && pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]
  if (match) return ROUTE_LABELS[match] ?? pathname
  return 'Área logada'
}
