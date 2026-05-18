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
      { href: '/telemarketing', label: 'Telemarketing' },
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
  '/telemarketing': 'Telemarketing',
  '/comunicacoes': 'Comunicações Órfãs',
  '/dashboards': 'Dashboards',
  '/reus': 'Réus canônicos',
  '/bancas': 'Bancas adversárias',
  '/configuracoes': 'Configurações',
  '/ausentes': 'Ausentes 6m',
  '/audit-log': 'Audit log',
  '/migracao-procedentes': 'Migração planilha',
}

const TELEMARKETING_HREFS = new Set(['/telemarketing', '/pendencias'])

export function navSectionsForPerfil(perfil: string | undefined): NavSection[] {
  if (perfil === 'telemarketing') {
    return [
      {
        label: 'Operacional',
        items: NAV_SECTIONS.flatMap((s) => s.items).filter((i) =>
          TELEMARKETING_HREFS.has(i.href),
        ),
      },
    ]
  }
  return NAV_SECTIONS
}

export function telemarketingAllowedPath(pathname: string): boolean {
  return (
    pathname === '/telemarketing' ||
    pathname.startsWith('/telemarketing/') ||
    pathname === '/pendencias' ||
    pathname.startsWith('/pendencias/')
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
