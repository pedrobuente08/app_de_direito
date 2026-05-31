// Design tokens Pauta — importado de UPGRADE/design-system.ts

export const colors = {
  paper: '#F2EEE4',
  paperLight: '#FBFAF6',
  paperLighter: '#EDE8DA',
  line: '#E3DDCD',
  lineDark: '#D7D0BD',
  ink: '#1B1C14',
  inkSoft: '#45463B',
  muted: '#83826F',
  faint: '#A9A795',
  forestDeep: '#11362A',
  forest: '#1C4435',
  forestLight: '#2B5C47',
  sage: '#9DB3A4',
  ochre: '#BD7A34',
  clay: '#AE4A30',
  pos: '#3C7A55',
  posBg: '#E6EEE4',
  black: '#000000',
  white: '#FFFFFF',
} as const

export const typography = {
  display: 'var(--font-display)',
  sans: 'var(--font-sans)',
  mono: 'var(--font-mono)',
  sizes: {
    xs: '10.5px',
    sm: '11.5px',
    base: '14px',
    md: '13.5px',
    lg: '15px',
    xl: '17px',
    '2xl': '18.5px',
    '3xl': '23px',
    '4xl': '30px',
    '5xl': '33px',
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  leading: {
    tight: '1.05',
    normal: '1.45',
    relaxed: '1.5',
  },
} as const

export const spacing = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '18px',
  '3xl': '22px',
  '4xl': '26px',
  '5xl': '30px',
  '6xl': '38px',
  '7xl': '40px',
} as const

export const layout = {
  sidebarWidth: '248px',
  contentMaxWidth: '1440px',
  topbarHeight: '60px',
  borderRadius: {
    sm: '9px',
    md: '10px',
    lg: '12px',
    xl: '15px',
  },
} as const

export const shadows = {
  xs: '0 1px 2px rgba(27, 28, 20, 0.06)',
  sm: '0 1px 2px rgba(27, 28, 20, 0.12)',
  md: '0 4px 6px rgba(27, 28, 20, 0.08)',
} as const

export const zIndex = {
  sidebar: 10,
  overlay: 50,
  modal: 100,
  tooltip: 150,
} as const

export const componentStyles = {
  sidebar: {
    bg: colors.forestDeep,
    text: '#E9E4D6',
    width: layout.sidebarWidth,
    padding: spacing['5xl'],
  },
  brand: {
    fontSize: typography.sizes['3xl'],
    fontFamily: typography.display,
    fontWeight: typography.weights.semibold,
    color: '#F3EEE1',
  },
  navLink: {
    padding: `${spacing.md} ${spacing.lg}`,
    borderRadius: layout.borderRadius.lg,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: '#C5C8B9',
  },
  main: {
    padding: `${spacing['4xl']} ${spacing['6xl']}`,
  },
  button: {
    bg: colors.forest,
    color: '#F3EEE1',
    padding: `${spacing.md} ${spacing.xl}`,
    borderRadius: layout.borderRadius.md,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  card: {
    bg: colors.paperLight,
    border: `1px solid ${colors.line}`,
    borderRadius: layout.borderRadius.xl,
    padding: `${spacing['2xl']} ${spacing['3xl']}`,
  },
  kpiCard: {
    bg: colors.paperLight,
    border: `1px solid ${colors.line}`,
    borderRadius: layout.borderRadius.xl,
    padding: spacing['2xl'],
  },
  heading: {
    fontFamily: typography.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes['5xl'],
    letterSpacing: '-0.4px',
    lineHeight: typography.leading.tight,
  },
  heading2: {
    fontFamily: typography.display,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes['2xl'],
    letterSpacing: '-0.2px',
  },
  tag: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    letterSpacing: '0.6px',
    textTransform: 'uppercase' as const,
    color: colors.forestLight,
    border: `1px solid ${colors.lineDark}`,
    borderRadius: '20px',
    padding: `${spacing.sm} ${spacing.lg}`,
    bg: colors.paperLighter,
  },
  insight: {
    bg: 'var(--card-2)',
    border: `1px solid ${colors.line}`,
    borderLeft: `3px solid ${colors.forestLight}`,
    borderRadius: layout.borderRadius.sm,
    padding: `${spacing.lg} ${spacing.xl}`,
  },
  whatsappCard: {
    bg: '#0E2B22',
    border: '1px solid #0E2B22',
    borderRadius: layout.borderRadius.xl,
    padding: spacing['2xl'],
    color: '#E7E3D6',
  },
} as const

export const mockData = {
  kpis: [
    {
      label: 'Processos ativos',
      value: '342',
      delta: '+12',
      deltaLabel: 'novos este mês',
      icon: 'file' as const,
      type: 'up' as const,
    },
    {
      label: 'Prazos em 7 dias',
      value: '18',
      delta: '3 críticos',
      deltaLabel: '2 sem responsável',
      icon: 'calendar' as const,
      type: 'warn' as const,
    },
    {
      label: 'Taxa de êxito',
      value: '73%',
      delta: '+4 pts',
      deltaLabel: 'acervo encerrado',
      icon: 'shield' as const,
      type: 'up' as const,
    },
    {
      label: 'Tempo até sentença',
      value: '1a 4m',
      delta: '▼ 18%',
      deltaLabel: 'vs. média da comarca',
      icon: 'clock' as const,
      type: 'ochre' as const,
    },
  ],
  jurimetriaChart: [
    { comarca: 'Salvador', subtext: '1ª Vara Cível', seu: 14, media: 19 },
    { comarca: 'Lauro de Freitas', subtext: 'Vara Cível', seu: 11, media: 16 },
    { comarca: 'Camaçari', subtext: '2ª Vara', seu: 9, media: 13 },
    { comarca: 'Feira de Santana', subtext: '1ª Vara Cível', seu: 22, media: 21, acima: true },
  ],
  previsao: {
    caso: 'Silva × Banco Bradesco',
    numero: '8003421-77.2024.8.05.0001',
    tipo: 'Indenizatória',
    probabilidade: 68,
    valor: 'R$ 42,3 mil',
    duracao: '~11 meses',
    vara: '3ª Vara Cível de Salvador',
    tendencia: '61%',
  },
  prazos: [
    {
      dia: '30',
      mes: 'mai',
      tipo: 'Contestação — Réu',
      caso: 'Pereira × Município de Salvador · 8001.../8.05',
      fonte: 'DJEN',
      responsavel: 'A',
      responsavelCor: '#2B5C47',
      criticidade: 'crit' as const,
    },
    {
      dia: '02',
      mes: 'jun',
      tipo: 'Manifestar sobre laudo',
      caso: 'Silva × Bradesco · 8003421-77.2024.8.05',
      fonte: 'DJEN',
      responsavel: 'P',
      responsavelCor: '#BD7A34',
      criticidade: 'soon' as const,
    },
    {
      dia: '05',
      mes: 'jun',
      tipo: 'Razões finais',
      caso: 'Costa × Seguradora Azul · 0712233-...8.05',
      fonte: 'DJEN',
      responsavel: 'A',
      responsavelCor: '#2B5C47',
      criticidade: 'ok' as const,
    },
  ],
  whatsapp: {
    clientMsg: 'oi, alguma novidade no meu processo contra o banco?',
    botReply:
      'Olá, Sr. Silva! Saiu uma decisão: o juiz pediu um laudo de um perito. É um passo normal — seu advogado tem até 02/jun para se manifestar. Te aviso quando houver o próximo andamento. 🙂',
  },
} as const
