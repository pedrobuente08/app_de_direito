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
    label: 'Operação',
    items: [
      { href: '/painel', label: 'Painel' },
      { href: '/intimacoes', label: 'Intimações' },
      { href: '/procedentes', label: 'Procedentes' },
      { href: '/recursos', label: 'Recursos' },
      { href: '/improcedentes', label: 'Improcedentes' },
      { href: '/reprotocolo', label: 'Reprotocolo' },
      { href: '/agenda', label: 'Agenda' },
      { href: '/pendencias', label: 'Pendências' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/importacao', label: 'Importação PDF' },
      { href: '/atendimento', label: 'Atendimento' },
      { href: '/publicacoes', label: 'Publicações DJEN' },
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
      { href: '/configuracoes/ia-plano', label: 'IA & Plano' },
    ],
  },
]

/** Rótulo da aba atual para breadcrumb (mais específico primeiro). */
export const ROUTE_LABELS: Record<string, string> = {
  '/painel': 'Painel',
  '/intimacoes': 'Intimações',
  '/procedentes': 'Procedentes',
  '/recursos': 'Recursos',
  '/improcedentes': 'Improcedentes',
  '/reprotocolo': 'Reprotocolo',
  '/agenda': 'Agenda',
  '/pendencias': 'Pendências',
  '/importacao': 'Importação PDF',
  '/atendimento': 'Atendimento',
  '/publicacoes': 'Publicações DJEN',
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
  '/configuracoes/ia-plano': 'IA & Plano',
  '/ausentes': 'Ausentes 6m',
  '/audit-log': 'Audit log',
  '/migracao-procedentes': 'Migração planilha',
}

const ATENDIMENTO_HREFS = new Set(['/pendencias', '/atendimento'])
const PAUTISTA_HREFS = new Set(['/agenda'])

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
  if (perfil === 'pautista') {
    return [
      {
        label: 'Operacional',
        items: NAV_SECTIONS.flatMap((s) => s.items).filter((i) =>
          PAUTISTA_HREFS.has(i.href),
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

export function pautistaAllowedPath(pathname: string): boolean {
  return pathname === '/agenda' || pathname.startsWith('/agenda/')
}

export function labelForPath(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  const match = Object.keys(ROUTE_LABELS)
    .filter((p) => p !== '/' && pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]
  if (match) return ROUTE_LABELS[match] ?? pathname
  return 'Área logada'
}
