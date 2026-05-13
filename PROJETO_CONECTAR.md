# CONECTAR — Documento de Projeto

> Referência técnica completa para desenvolvimento do webservice.
> Leia junto com `BRIEFING_DEV_M0.md` (regras de negócio) e `VISAO_GERAL_SOFTWARE.md` (produto).

---

## Índice

1. [Visão geral e decisões fechadas](#1-visão-geral-e-decisões-fechadas)
2. [Stack](#2-stack)
3. [Estrutura de repositório](#3-estrutura-de-repositório)
4. [Design system](#4-design-system)
5. [Backend — arquitetura](#5-backend--arquitetura)
6. [Frontend — arquitetura](#6-frontend--arquitetura)
7. [Autenticação e multi-tenancy](#7-autenticação-e-multi-tenancy)
8. [Banco de dados](#8-banco-de-dados)
9. [Skill de extração de PDF](#9-skill-de-extração-de-pdf)
10. [Worker assíncrono](#10-worker-assíncrono)
11. [Integração Comunica (CNJ)](#11-integração-comunica-cnj)
12. [Segurança e observabilidade](#12-segurança-e-observabilidade)
13. [Variáveis de ambiente](#13-variáveis-de-ambiente)
14. [Deploy e infraestrutura](#14-deploy-e-infraestrutura)
15. [Seed inicial](#15-seed-inicial)
16. [Origem dos projetos de referência](#16-origem-dos-projetos-de-referência)

---

## 1. Visão geral e decisões fechadas

**CONECTAR** é um SaaS B2B de gestão de captação massiva para escritórios de advocacia com perfil consumerista (alto volume, teses repetidas contra bancos, financeiras, telefonia).

Substitui uma planilha Google Sheets + Apps Script que chegou no teto operacional (~800 processos ativos, arquivo `.gs` de 4000+ linhas, sem multi-user real).

### Decisões que não voltam para discussão

| Decisão | Motivo |
|---|---|
| Multi-tenant desde M0 | `escritorio_id` em toda tabela operacional — produto vendável |
| Edit inline tipo planilha | AG Grid — requisito inegociável da adm |
| Skill Python mantida como é | v9.1, 894 linhas, determinística, zero custo por extração |
| Data residency Brasil | LGPD — Supabase região São Paulo (AWS sa-east-1) |
| JWT próprio, não Firebase/Supabase Auth | Multi-tenant B2B com 4 perfis por escritório precisa de controle total |
| Drizzle ORM, não Prisma | Queries analíticas dos dashboards exigem SQL real com tipos |

---

## 2. Stack

### Backend

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js | 22 LTS |
| Framework | NestJS | 11 |
| ORM | Drizzle ORM | latest |
| Driver Postgres | `postgres` (pg nativo) | latest |
| Auth | Passport-JWT + bcrypt | — |
| Queue/Worker | BullMQ | 5 |
| Cache/Rate limit | Redis (Upstash ou self-hosted) | — |
| Validação | class-validator + class-transformer | — |
| Upload | Multer (multipart/form-data) | — |
| Email | Nodemailer | — |
| Rate limiting | `@nestjs/throttler` | — |
| Segurança HTTP | Helmet | — |
| Monitoramento erros | Sentry (`@sentry/node`) | — |
| Logging | Pino (`nestjs-pino`) | — |

### Frontend

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js App Router | 14 |
| Linguagem | TypeScript | 5 |
| Estilo | Tailwind CSS | 3 |
| Componentes | shadcn/ui (Base UI) | — |
| Grid editável | AG Grid Community | 32 |
| Charts | Recharts | 2 |
| Requisições | TanStack Query (React Query) | 5 |
| Estado global | Zustand | 5 |
| Formulários | react-hook-form + Zod | — |
| Fonte | Inter (variable) | — |
| Ícones | Lucide React | — |
| Monitoramento erros | Sentry (`@sentry/nextjs`) | — |

### Banco e infra

| Componente | Tecnologia |
|---|---|
| Banco | Postgres 15+ no Supabase (região São Paulo) |
| Storage PDFs | Supabase Storage (S3-compatible) |
| Queue backend | Redis — Upstash (serverless) ou Railway |
| Hospedagem backend | Railway (BR) ou Fly.io |
| Hospedagem frontend | Vercel |
| CI/CD | GitHub Actions |

### Extração de PDF (skill existente)

A skill `extract_projudi_LATEST.py` (v9.1) **não é reescrita** e **não é substituída por IA**.
É chamada via `child_process.spawn` dentro de um BullMQ worker no backend.

```
POST /api/processos/upload-pdf
        ↓
Multer salva arquivo temporariamente
        ↓
Job adicionado à fila `pdf-extraction`
        ↓
Worker spawna: python3 extract_projudi_LATEST.py <caminho>
        ↓
Parseia stdout (JSON/TSV), insere processos com anti-dup
        ↓
PDF original enviado pro Supabase Storage, temp deletado
```

---

## 3. Estrutura de repositório

Monorepo com **npm workspaces** (`package.json` na raiz com `"workspaces": ["apps/*"]`). Scripts agregados na raiz: `npm run dev:api`, `npm run dev:web`, `npm run db:push`, etc.

```
conectar/
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/               # JWT, guards, decorators
│   │   │   ├── tenant/             # Interceptor de tenant (injeta escritorio_id)
│   │   │   ├── processos/          # INTIMAÇÕES — CRUD + upload PDF
│   │   │   ├── pendencias/         # PENDÊNCIAS
│   │   │   ├── audiencias/         # AUDIÊNCIAS
│   │   │   ├── procedentes/        # Vista PROCEDENTES + máquina de estados
│   │   │   ├── reus/               # Réu canônico + aliases + fuzzy match
│   │   │   ├── comarcas/           # Mapa de comarcas por escritório
│   │   │   ├── comunica/           # Webhook CNJ + processamento
│   │   │   ├── dashboards/         # Endpoints analíticos (queries Drizzle)
│   │   │   ├── importacao/         # CSV/Excel → bulk insert
│   │   │   ├── usuarios/           # CRUD usuários do escritório
│   │   │   ├── escritorios/        # Admin — cadastro de tenants
│   │   │   ├── config/             # Configurações por escritório
│   │   │   ├── audit/              # Audit log service
│   │   │   ├── storage/            # Supabase Storage adapter
│   │   │   ├── workers/            # BullMQ processors
│   │   │   │   ├── pdf.processor.ts
│   │   │   │   ├── retencao.processor.ts
│   │   │   │   └── comunica.processor.ts
│   │   │   ├── db/                 # Drizzle schema + migrations
│   │   │   │   ├── schema/
│   │   │   │   │   ├── escritorio.ts
│   │   │   │   │   ├── usuario.ts
│   │   │   │   │   ├── processo.ts
│   │   │   │   │   ├── pendencia.ts
│   │   │   │   │   ├── audiencia.ts
│   │   │   │   │   ├── procedente.ts
│   │   │   │   │   ├── reu.ts
│   │   │   │   │   ├── comunicacao.ts
│   │   │   │   │   └── audit.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── client.ts
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   ├── decorators/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── pipes/
│   │   │   │   └── filters/
│   │   │   └── main.ts
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # Next.js frontend
│       ├── app/
│       │   ├── (public)/
│       │   │   └── login/
│       │   │       └── page.tsx
│       │   ├── (app)/              # Tudo atrás de auth
│       │   │   ├── layout.tsx      # Sidebar + header
│       │   │   ├── intimacoes/
│       │   │   │   └── page.tsx    # AG Grid — INTIMAÇÕES
│       │   │   ├── pendencias/
│       │   │   │   └── page.tsx    # AG Grid — PENDÊNCIAS + semáforo
│       │   │   ├── audiencias/
│       │   │   │   └── page.tsx    # AG Grid — AUDIÊNCIAS
│       │   │   ├── procedentes/
│       │   │   │   └── page.tsx    # AG Grid — PROCEDENTES (máquina de estados)
│       │   │   ├── dashboards/
│       │   │   │   ├── varas/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── pendencias/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── audiencias/
│       │   │   │       └── page.tsx
│       │   │   ├── reus/
│       │   │   │   └── page.tsx    # Gestão de réus canônicos + aliases
│       │   │   ├── comunica/
│       │   │   │   └── page.tsx    # Log de comunicações + órfãs
│       │   │   ├── importacao/
│       │   │   │   └── page.tsx    # Upload CSV/Excel
│       │   │   ├── usuarios/
│       │   │   │   └── page.tsx
│       │   │   └── configuracoes/
│       │   │       └── page.tsx
│       │   ├── admin/              # Superadmin — gestão de escritórios
│       │   │   └── escritorios/
│       │   ├── layout.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── ui/                 # shadcn/ui (copiado, não dependência)
│       │   ├── grid/               # AG Grid wrappers e cell renderers
│       │   ├── charts/             # Recharts wrappers
│       │   └── layout/             # Sidebar, Header, Breadcrumb
│       ├── lib/
│       │   ├── api.ts              # Axios client com interceptors
│       │   ├── query-client.ts     # TanStack Query config
│       │   ├── utils.ts            # cn(), formatters
│       │   └── types.ts            # Tipos compartilhados
│       ├── store/
│       │   └── auth.ts             # Zustand — user, escritorio, perfil
│       ├── hooks/                  # useProcessos, usePendencias, etc.
│       ├── middleware.ts           # Proteção de rotas
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                     # Tipos TypeScript compartilhados (opcional)
│
├── skill/                          # Skill Python de extração (não muda)
│   └── extract_projudi_LATEST.py   # v9.1 — referência de PROTOCOLOS_AUTOMACAO_ATUAL/_motor/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docker-compose.yml              # Dev local: Postgres + Redis
├── package-lock.json               # lockfile npm (versionado)
└── package.json                    # workspaces + scripts da raiz
```

---

## 4. Design system

Baseado na mesma estrutura do `sistema_ocorrencias` (shadcn/ui + Tailwind + Base UI), mas com paleta e identidade distintas.

### Diferenças em relação ao `sistema_ocorrencias`

| Aspecto | `sistema_ocorrencias` | CONECTAR |
|---|---|---|
| Fundo da app | Warm stone `#F5F5F4` | Cool slate `#F1F5F9` |
| Fundo de surface | `#FFFFFF` | `#FFFFFF` |
| Brand color | Azul `#2563EB` | Teal `#0D9488` |
| Brand hover | `#1D4ED8` | `#0F766E` |
| Brand subtle | `#EFF6FF` | `#F0FDFA` |
| Texto primário | Warm `#1C1917` | Slate `#0F172A` |
| Bordas | Warm `#E8E6E3` | Cool `#E2E8F0` |
| Border radius base | `0.5rem` | `0.375rem` (mais "enterprise") |
| Fonte | Geist Sans | Inter (variable) |
| Sidebar width | 220px | 240px |

### `globals.css` do CONECTAR

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn tokens */
    --background: 0 0% 100%;
    --foreground: 222 47% 5%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 5%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 5%;
    --primary: 173 80% 32%;        /* teal-600 */
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 172 76% 95%;
    --accent-foreground: 173 80% 20%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 88%;
    --input: 214 32% 88%;
    --ring: 173 80% 32%;
    --radius: 0.375rem;

    /* === BACKGROUNDS === */
    --color-bg-app:     #F1F5F9;   /* slate-100 */
    --color-bg-surface: #FFFFFF;
    --color-bg-subtle:  #F8FAFC;   /* slate-50 */
    --color-bg-muted:   #F1F5F9;
    --color-bg-hover:   #E9EEF5;

    /* === BORDAS === */
    --color-border-default: #E2E8F0;   /* slate-200 */
    --color-border-strong:  #CBD5E1;   /* slate-300 */

    /* === TEXTO === */
    --color-text-primary:   #0F172A;   /* slate-900 */
    --color-text-secondary: #64748B;   /* slate-500 */
    --color-text-tertiary:  #94A3B8;   /* slate-400 */
    --color-text-inverse:   #FFFFFF;

    /* === BRAND (teal) === */
    --color-brand:        #0D9488;     /* teal-600 */
    --color-brand-hover:  #0F766E;     /* teal-700 */
    --color-brand-subtle: #F0FDFA;     /* teal-50 */
    --color-brand-text:   #115E59;     /* teal-800 */

    /* === URGÊNCIA / SEMÁFORO (PENDÊNCIAS) === */
    --urgencia-vencida-bg:    #FEF2F2;
    --urgencia-vencida-text:  #991B1B;
    --urgencia-vencida-border:#FECACA;

    --urgencia-urgente-bg:    #FFF7ED;
    --urgencia-urgente-text:  #9A3412;
    --urgencia-urgente-border:#FED7AA;

    --urgencia-atencao-bg:    #FFFBEB;
    --urgencia-atencao-text:  #92400E;
    --urgencia-atencao-border:#FDE68A;

    --urgencia-normal-bg:     #F0FDF4;
    --urgencia-normal-text:   #166534;
    --urgencia-normal-border: #BBF7D0;

    --urgencia-sem-prazo-bg:  #F8FAFC;
    --urgencia-sem-prazo-text:#475569;
    --urgencia-sem-prazo-border:#CBD5E1;

    /* === SENTENÇA === */
    --sentenca-procedente-bg:   #F0FDF4;
    --sentenca-procedente-text: #166534;
    --sentenca-parcial-bg:      #FFFBEB;
    --sentenca-parcial-text:    #92400E;
    --sentenca-acordo-bg:       #EFF6FF;
    --sentenca-acordo-text:     #1E40AF;
    --sentenca-improcedente-bg: #FEF2F2;
    --sentenca-improcedente-text:#991B1B;

    /* === AUDIÊNCIA STATUS === */
    --aud-agendada-bg:      #EFF6FF;
    --aud-agendada-text:    #1D4ED8;
    --aud-realizada-bg:     #F0FDF4;
    --aud-realizada-text:   #166534;
    --aud-cancelada-bg:     #FEF2F2;
    --aud-cancelada-text:   #991B1B;
    --aud-redesignada-bg:   #FDF4FF;
    --aud-redesignada-text: #7E22CE;

    /* === PROCEDENTES — FAMÍLIA === */
    --familia-em-recurso-bg:        #FDF4FF;
    --familia-em-recurso-text:      #7E22CE;
    --familia-aguardar-transito-bg: #FFFBEB;
    --familia-aguardar-transito-text:#92400E;
    --familia-pend-interna-bg:      #FEF2F2;
    --familia-pend-interna-text:    #991B1B;
    --familia-exec-ativa-bg:        #EFF6FF;
    --familia-exec-ativa-text:      #1D4ED8;
    --familia-aguardar-pagto-bg:    #F0FDF4;
    --familia-aguardar-pagto-text:  #166534;
    --familia-encerrado-bg:         #F8FAFC;
    --familia-encerrado-text:       #475569;

    /* === LAYOUT === */
    --sidebar-width: 240px;
    --header-height: 52px;

    /* === RADIUS === */
    --radius-sm:   3px;
    --radius-md:   6px;
    --radius-lg:   10px;
    --radius-full: 9999px;

    /* === SOMBRAS === */
    --shadow-sm: 0 1px 2px rgba(15,23,42,0.06);
    --shadow-md: 0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04);
    --shadow-lg: 0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04);
  }

  * { border-color: hsl(var(--border)); }

  body {
    background-color: var(--color-bg-app);
    color: var(--color-text-primary);
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "cv11", "ss01";
  }

  html {
    font-family: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
  }
}

/* AG Grid overrides — integração com o design system */
.ag-theme-conectar {
  --ag-background-color: var(--color-bg-surface);
  --ag-odd-row-background-color: var(--color-bg-subtle);
  --ag-header-background-color: var(--color-bg-muted);
  --ag-border-color: var(--color-border-default);
  --ag-row-hover-color: var(--color-bg-hover);
  --ag-selected-row-background-color: var(--color-brand-subtle);
  --ag-font-family: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
  --ag-font-size: 13px;
  --ag-cell-horizontal-padding: 12px;
  --ag-row-height: 36px;
  --ag-header-height: 38px;
  --ag-borders: solid 1px;
  --ag-cell-focus-border: solid 2px var(--color-brand);
}

/* Scrollbar */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 9px; }

/* Animações */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fadeInUp 0.18s ease both; }
```

### Componentes shadcn que serão copiados (igual ao `sistema_ocorrencias`)

```
button, badge, card, dialog, dropdown-menu, input, label,
select, separator, sheet, skeleton, table, tabs, textarea,
tooltip, avatar, popover, command, calendar, date-picker
```

### Componentes adicionais (específicos do CONECTAR)

| Componente | Onde usa |
|---|---|
| `<SemaforoUrgencia />` | Badge com cor por faixa de prazo nas PENDÊNCIAS |
| `<SentencaBadge />` | Badge colorido por tipo de sentença |
| `<FamiliaBadge />` | Badge das 6 famílias da vista PROCEDENTES |
| `<GridToolbar />` | Barra acima do AG Grid (filtros rápidos, upload PDF, exportar) |
| `<UploadPdfDrawer />` | Drawer lateral para upload e preview de extração |
| `<TenantSwitcher />` | Para admin com acesso a múltiplos escritórios (futuramente) |
| `<StatCard />` | Cards do topo dos dashboards |
| `<HeatmapGrid />` | Heatmap tese × réu × vara (indicador estrela) |

---

## 5. Backend — arquitetura

### Convenções (mesmas do `sistema_ocorrencias`)

- Um módulo NestJS por domínio: `module / controller / service / dto`
- `service` contém regras de negócio + chamadas ao Drizzle
- `controller` só recebe request, chama service, retorna response
- Guards globais: `JwtAuthGuard` (default) + `TenantGuard`
- Decorators: `@CurrentUser()`, `@CurrentEscritorio()`, `@Roles(...)`

### Módulo de tenant (crítico para multi-tenancy)

Todo request autenticado passa por um **TenantInterceptor** que:
1. Extrai `escritorio_id` e `perfil` do JWT
2. Injeta em `request.tenant` e `request.user`
3. O `service` sempre recebe `escritorio_id` — nunca busca no banco de forma global

```typescript
// Exemplo de como fica um service
async listarProcessos(escritorioId: string, filters: ListProcessosDto) {
  return this.db
    .select()
    .from(processoTable)
    .where(
      and(
        eq(processoTable.escritorioId, escritorioId),  // sempre presente
        filters.vara ? eq(processoTable.vara, filters.vara) : undefined,
      )
    )
    .orderBy(desc(processoTable.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);
}
```

### Estrutura do `main.ts` (extensão do `sistema_ocorrencias`)

```typescript
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'],  // Pino assume o logging de app
  });

  // Helmet — headers de segurança HTTP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS — igual ao sistema_ocorrencias, mesma lógica de allowlist
  app.enableCors({ /* ... */ });

  // Rate limiting global — proteção base
  // Limites específicos por rota definidos com @Throttle() decorator
  app.useGlobalGuards(new ThrottlerGuard());

  // Validação global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Filtro global de exceções — formata erros + envia para Sentry
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api');

  // Sentry — inicializa antes do listen
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });

  await app.listen(process.env.PORT ?? 3001);
}
```

### Rate limiting por rota

```typescript
// Default global: 100 req / 60s por IP
// Rotas sensíveis sobrescrevem:

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('auth/login')
login() {}

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('processos/upload-pdf')
uploadPdf() {}

@Throttle({ default: { limit: 3, ttl: 60000 } })
@Post('auth/recuperar-senha')
recuperarSenha() {}
```

### Audit log

Toda alteração crítica (`processo`, `pendencia`, `audiencia`, `processo_procedente`) é registrada automaticamente via um **AuditInterceptor** que captura o diff antes/depois e insere em `audit_log`.

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  // Captura body de entrada e resultado
  // Registra: usuario_id, escritorio_id, entidade, acao, diff, ip
  // Usa uma fila BullMQ para não adicionar latência no request
}
```

---

## 6. Frontend — arquitetura

### Padrão de página (igual ao `sistema_ocorrencias`)

```
app/(app)/intimacoes/
├── page.tsx                      # Server Component — só layout
├── _components/
│   ├── intimacoes-grid.tsx       # "use client" — AG Grid principal
│   ├── grid-toolbar.tsx          # "use client" — filtros + upload
│   └── upload-pdf-drawer.tsx     # "use client" — drawer de upload
```

### AG Grid — configuração base

```typescript
// components/grid/grid-base.tsx
const defaultColDef: ColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  editable: false,          // override por coluna
  suppressMovable: false,
  cellStyle: { fontSize: '13px' },
};

const gridOptions: GridOptions = {
  rowHeight: 36,
  headerHeight: 38,
  suppressRowClickSelection: true,
  rowSelection: 'multiple',
  animateRows: false,        // desabilitado — performa melhor em >500 linhas
  suppressColumnVirtualisation: false,
  enableCellTextSelection: true,
  stopEditingWhenCellsLoseFocus: true,
  undoRedoCellEditing: true,
  undoRedoCellEditingLimit: 20,
};
```

### Edit inline e persistência

```typescript
// Padrão para onCellValueChanged em todas as grids
const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
  const { data, colDef, newValue, oldValue } = event;
  if (newValue === oldValue) return;

  try {
    await patchProcesso(data.id, { [colDef.field!]: newValue });
    // TanStack Query invalida a key do escritório — próxima renderização sincronizada
    queryClient.invalidateQueries({ queryKey: ['processos', escritorioId] });
  } catch (err) {
    // Reverte o valor visual
    event.node.setDataValue(colDef.field!, oldValue);
    toast.error('Erro ao salvar. Tente novamente.');
    Sentry.captureException(err);
  }
}, []);
```

### Zustand store de auth

```typescript
// store/auth.ts
interface AuthState {
  user: Usuario | null;
  escritorio: Escritorio | null;
  perfil: 'admin' | 'adm' | 'advogado' | 'leitura' | null;
  token: string | null;
  setSession: (payload: SessionPayload) => void;
  clearSession: () => void;
  can: (acao: Acao) => boolean;  // helper de permissão
}
```

### Proteção de rotas

```typescript
// middleware.ts — igual ao sistema_ocorrencias
export function middleware(request: NextRequest) {
  const token = request.cookies.get('conectar_token')?.value;
  const isAppRoute = request.nextUrl.pathname.startsWith('/(app)');

  if (isAppRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}
```

---

## 7. Autenticação e multi-tenancy

### Fluxo de auth

```
POST /api/auth/login { email, senha }
        ↓
AuthService valida bcrypt hash
        ↓
Gera access_token (JWT, 15min) + refresh_token (JWT, 7d)
        ↓
Access token: payload { sub: userId, escritorioId, perfil, email }
        ↓
Frontend armazena access em memória (Zustand), refresh em httpOnly cookie
        ↓
Toda request: Authorization: Bearer <access_token>
        ↓
JwtStrategy valida + TenantInterceptor injeta escritorioId no request
```

### JWT payload

```typescript
interface JwtPayload {
  sub: string;          // usuario.id
  escritorioId: string; // escritorio.id
  perfil: Perfil;       // 'admin' | 'adm' | 'advogado' | 'leitura'
  email: string;
  iat: number;
  exp: number;
}
```

### Refresh token rotation

```
POST /api/auth/refresh  (cookie httpOnly com refresh token)
        ↓
Valida refresh token na tabela `refresh_tokens`
        ↓
Invalida o token usado (rotation — não reutilizável)
        ↓
Emite novo par access + refresh
```

A tabela `refresh_tokens` tem: `id, usuario_id, token_hash, expires_at, revogado, created_at`.
Job de limpeza diário remove tokens expirados.

### Permissões por perfil

| Ação | admin | adm | advogado | leitura |
|---|---|---|---|---|
| Ver processos | ✓ | ✓ | ✓ | ✓ |
| Editar processos inline | ✓ | ✓ | ✓ | — |
| Upload PDF | ✓ | ✓ | — | — |
| Gerenciar pendências | ✓ | ✓ | ✓ | — |
| Gerenciar audiências | ✓ | ✓ | ✓ | — |
| Ver dashboards | ✓ | ✓ | ✓ | ✓ |
| Configurar escritório | ✓ | — | — | — |
| Gerenciar usuários | ✓ | — | — | — |
| Importar CSV | ✓ | ✓ | — | — |
| Configurar Comunica | ✓ | — | — | — |
| Aprovar merge de réu | ✓ | ✓ | — | — |

### 2FA (M0 opcional, arquitetura prevista)

Implementado via TOTP (Google Authenticator / Authy). Quando ativado pelo usuário:
- `usuario.totp_secret` (criptografado at rest)
- Login exige second factor antes de emitir tokens
- Lib: `otplib`

---

## 8. Banco de dados

### Ajustes de schema (PLANO_AJUSTES — maio/2026)

Implementado no repositório conforme `PLANO_AJUSTES.md` e alinhado ao briefing:

- **`sentenca`** — tabela 1:N com `processo` (grau, data, valor, `resultado`, `favoravel_para`, etc.). Indicadores e procedentes usam a **última** sentença por `data` / `created_at`.
- **`processo`** — `status_processo` (ATIVO \| SOBRESTADO \| ARQUIVADO) separado de `fase_atual`; campos `qualidade_caso`, `avaliacao_recurso` (JSONB), `justica_gratuita`; removidos da tabela os campos de sentença que migraram para `sentenca`.
- **`fase_historico`** — auditoria de mudanças de fase (origem MANUAL na edição via API).
- **`audiencia_ausente`** — snapshot quando audiência REALIZADA com autor AUSENTE; relatório `GET /audiencias/relatorio-ausentes-6m`.
- **`escritorio_adversario`** + **`escritorio_adversario_alias`**; FK opcional em `audiencia`.
- **`improcedente`** — sucumbência; listagem `GET /improcedentes`.
- **`pendencia.origem`** — padrão `MANUAL_INTIMACOES`; valores operacionais `POS_AUDIENCIA`, `MANUAL_INTIMACOES`, `COMUNICA`, `IMPORT` (e `MANUAL` aceito no DTO para legado).
- **Procedentes** — família `EM_RECURSO` removida da UI (cinco famílias finais).

**Novas rotas REST:** `GET`/`POST /sentencas` (query `processoId` no GET; corpo com `processoId` no POST), `GET /improcedentes`, `GET`/`POST /escritorios-adversarios`, `GET /audiencias/relatorio-ausentes-6m`.

### Drizzle — por que não Prisma

O modelo de dados tem queries analíticas pesadas nos dashboards (§ 8 do `BRIEFING_DEV_M0.md`) que usam `PERCENTILE_CONT`, window functions, `FILTER WHERE`, CTEs. Com Prisma, todas cairiam em `$queryRaw` perdendo type-safety. Com Drizzle, mesmo essas queries têm tipagem completa.

Comparação para o dashboard de varas:

```typescript
// Com Drizzle — tipado de ponta a ponta
const resultado = await db
  .select({
    vara: processo.vara,
    materia: processo.materia,
    reuId: processo.reuId,
    amostra: count(),
    taxaFavoravel: sql<number>`
      COUNT(*) FILTER (WHERE (
        SELECT s.resultado FROM sentenca s
        WHERE s.processo_id = ${processo.id}
        ORDER BY s.data DESC NULLS LAST, s.created_at DESC NULLS LAST
        LIMIT 1
      ) IN ('PROCEDENTE','PARCIAL','ACORDO'))
      * 100.0 / COUNT(*)
    `,
  })
  .from(processo)
  .where(
    and(
      eq(processo.escritorioId, escritorioId),
      sql`exists (select 1 from sentenca s where s.processo_id = ${processo.id})`,
      gte(processo.updatedAt, periodoInicio),
    )
  )
  .groupBy(processo.vara, processo.materia, processo.reuId)
  .having(gte(count(), 3));
// resultado é tipado automaticamente pelo Drizzle
```

### Configuração Drizzle

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### Criptografia de campos sensíveis

CPF e telefone são criptografados at rest com AES-256-GCM usando `APP_ENCRYPTION_KEY`.

```typescript
// common/crypto.service.ts
@Injectable()
export class CryptoService {
  encrypt(plaintext: string): string { /* AES-256-GCM */ }
  decrypt(ciphertext: string): string { /* ... */ }
}

// No schema Drizzle — coluna armazena valor cifrado
// No service — CryptoService.encrypt() antes do insert, .decrypt() no select
```

### Tabela `extracao_pendente` (revisão manual + IA futura)

Criada para receber PDFs com confidence baixo. Guarda o texto bruto extraído pelo
pdfplumber — esse campo é o input da IA quando for integrada, sem mudança de schema.

```sql
CREATE TABLE extracao_pendente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorio(id),
  arquivo_nome VARCHAR(255) NOT NULL,
  arquivo_storage_key VARCHAR(500),      -- PDF arquivado no Supabase Storage
  texto_extraido TEXT NOT NULL,          -- texto bruto do pdfplumber (input da IA futura)
  resultado_skill JSONB NOT NULL,        -- output completo da skill (campos parciais + meta)
  confidence DECIMAL(3,2) NOT NULL,
  alerta VARCHAR(50),
  revisao_status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  -- PENDENTE | EM_REVISAO | APROVADO | REJEITADO
  sugestao_ia JSONB,                     -- preenchido pela IA quando integrada (null até lá)
  revisado_por UUID REFERENCES usuario(id),
  revisado_em TIMESTAMPTZ,
  processo_id UUID REFERENCES processo(id),  -- preenchido após aprovação
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_extracao_pendente_escritorio
  ON extracao_pendente(escritorio_id, revisao_status, created_at DESC);
```

**Fluxo hoje (M0):**
```
confidence < 0.6 → salva em extracao_pendente (status PENDENTE)
                 → adm vê na tela de revisão, preenche campos faltando, confirma insert
```

**Fluxo futuro (com IA — sem mudar schema):**
```
confidence < 0.6 → salva em extracao_pendente (status PENDENTE)
                 → job chama IA com texto_extraido
                 → IA retorna campos sugeridos → salva em sugestao_ia
                 → adm vê formulário pré-preenchido → confirma ou corrige → insert
```

A tela de revisão mostra:
- Campos extraídos pela skill → fundo verde
- Campos sugeridos pela IA (quando disponível) → fundo amarelo
- Campos ainda vazios → fundo vermelho, obrigatório preencher antes de confirmar

### Política de índices

Além dos índices definidos no `BRIEFING_DEV_M0.md`, adicionar:

```sql
-- Para paginação eficiente nas grids (cursor-based pagination)
CREATE INDEX idx_processo_created_at ON processo(escritorio_id, created_at DESC);
CREATE INDEX idx_pendencia_data_limite ON pendencia(escritorio_id, data_limite)
  WHERE status = 'ABERTA';
CREATE INDEX idx_audiencia_data ON audiencia(escritorio_id, data)
  WHERE status = 'AGENDADA';

-- Para o dashboard "processo esquecido"
CREATE INDEX idx_processo_updated_at ON processo(escritorio_id, updated_at)
  WHERE situacao_final IS NULL;

-- Audit log — leitura sempre por escritório + entidade
CREATE INDEX idx_audit_escritorio_entidade ON audit_log(escritorio_id, entidade, created_at DESC);
```

---

## 9. Skill de extração de PDF

### Princípio

A skill é o componente Python que lê PDFs de comprovante de cadastro/protocolo dos sistemas do TJBA e Justiça Federal e extrai os campos estruturados. Ela foi refinada em 9 versões contra PDFs reais e **não é reescrita** — apenas modularizada e exposta como microserviço.

### Arquitetura da skill (v10)

```
skill/
├── extract_core.py      # Lógica pura de extração — sem I/O, sem efeitos colaterais
├── server.py            # FastAPI — expõe /extract e /extract/batch
├── requirements.txt
└── tests/
    ├── pdfs/            # PDFs reais anonimizados (1 por formato)
    └── test_extraction.py
```

O arquivo original `extract_projudi_LATEST.py` permanece intacto para uso local da adm via `.bat` durante a transição. O novo `extract_core.py` é a versão produção.

### O que mudou em relação ao original

| Aspecto | Original (v9.1) | Novo (v10) |
|---|---|---|
| Output | TSV + clipboard | JSON estruturado com confidence score |
| Config | Hardcoded no arquivo | Injetada por chamada via `Config` dataclass |
| MAPA_COMARCAS | Fixo no código | Vem do banco (escritório) por chamada |
| LOGIN_MAP_SKILL | Fixo no código | Vem do banco (escritório) por chamada |
| MATERIAS_VALIDAS | Fixo no código | Vem do banco (escritório) por chamada |
| Google Sheets | `enviar_webapp()`, `URL_WEBAPP` | Removidos |
| File system | `mover_pdfs_processados()` | Removido (NestJS gerencia storage) |
| Interface | Terminal Windows com cores ANSI | Removida (microserviço) |
| Invocação | subprocess por PDF | FastAPI persistente (pdfplumber em memória) |

### Configuração injetável — por que é importante para multi-tenancy

As três configurações que antes eram hardcoded no arquivo viram parte do payload de cada chamada:

**`mapa_comarcas`**
Mapeia o código CNJ (últimos 4 dígitos do número do processo) para a sigla da comarca. Antes só tinha TJBA. Agora cada escritório pode ter seu próprio mapa — escritório de SP terá códigos paulistas, escritório de BA terá os baianos. Gerenciado na tela de **Configurações** do escritório e armazenado em `escritorio.config.mapa_comarcas`.

**`login_map`**
Mapeia variantes do nome do advogado/captador no nome do arquivo para o nome canônico. Cada escritório tem sua própria equipe. Quando a adm admite um novo advogado, ela cadastra no sistema e o mapa é atualizado sem tocar no código. Gerenciado em `escritorio.config.login_map`.

**`materias_validas`**
Lista das teses que o escritório opera. Usado para flagear quando uma matéria extraída do nome do arquivo não está na lista (aviso, não bloqueio). Gerenciado nos dropdowns de Configurações.

### Como o NestJS passa a config para a skill

O worker NestJS busca a config do escritório no banco antes de chamar a skill:

```typescript
// apps/api/src/workers/pdf.processor.ts
@Process()
async handle(job: Job<PdfJobData>) {
  const { fileBuffer, filename, escritorioId } = job.data;

  // Busca config do escritório (com cache Redis — 5min TTL)
  const config = await this.escritorioService.getSkillConfig(escritorioId);

  // Chama microserviço Python via HTTP
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), filename);
  form.append('config_json', JSON.stringify(config));

  const response = await this.httpService.axiosRef.post(
    `${process.env.SKILL_URL}/extract`,
    form,
    { headers: { 'X-Skill-Key': process.env.SKILL_API_KEY } },
  );

  const resultado = response.data;

  if (resultado.confidence === 0) {
    throw new Error(resultado.erro || resultado.alerta);
  }

  if (resultado.confidence < 0.6) {
    // Salva para revisão manual — não insere automaticamente
    await this.revisaoService.criar(resultado, escritorioId, job.data.uploadedBy);
    return { status: 'revisao_pendente', arquivo: filename };
  }

  // Insere com anti-dup
  await this.processosService.upsertFromSkill(resultado.processo, escritorioId);
  return { status: 'inserido', confidence: resultado.confidence };
}
```

### Formato de config enviado ao microserviço

```json
{
  "mapa_comarcas": {
    "0001": "SSA",
    "0039": "F. DE SANTANA",
    "0044": "CAMACARI"
  },
  "login_map": {
    "TAINARA": "TAINARA",
    "ANDRE": "ANDRÉ PITA",
    "ANDRE GABRIEL": "ANDRÉ PITA",
    "MURILO": "MURILO"
  },
  "materias_validas": ["NEGATIVAÇÃO", "CONTA CANCELADA", "EMBASA"],
  "fase_inicial": "AUDIÊNCIA AGENDADA",
  "situacao_inicial": "ATIVO"
}
```

### Resposta do microserviço

```json
{
  "processo": {
    "numero":            "0001234-12.2024.8.05.0001",
    "cliente_nome":      "FULANO DE TAL",
    "cliente_cpf":       "123.456.789-00",
    "reu_texto":         "BANCO BRADESCO S.A.",
    "vara":              "1ª SSA",
    "sistema":           "PROJUDI",
    "data_distribuicao": "15/03/2024",
    "data_audiencia":    "20/06/2024",
    "hora_audiencia":    "13:15",
    "tipo_audiencia":    "AIJ",
    "materia":           "NEGATIVAÇÃO",
    "login":             "TAINARA",
    "fase_inicial":      "AUDIÊNCIA AGENDADA",
    "situacao_inicial":  "ATIVO"
  },
  "confidence":        0.95,
  "campos_extraidos":  ["numero", "cliente_nome", "reu_texto", "vara", "data_distribuicao"],
  "campos_vazios":     [],
  "alerta":            null,
  "arquivo":           "fulano-negativacao-tainara.pdf",
  "sistema_detectado": "PROJUDI"
}
```

### Confidence score — lógica de decisão no NestJS

| Score | Ação |
|---|---|
| `0.0` | Erro fatal (PDF ilegível, scaneado, número não encontrado) — rejeita com mensagem |
| `0.01 – 0.59` | Extração parcial — vai para fila de **revisão manual** (tela específica) |
| `0.60 – 0.79` | Extração razoável — insere com flag `requer_conferencia = true` |
| `0.80 – 1.00` | Extração confiável — insere normalmente |

### Campos do confidence score

| Campo | Peso | Motivo |
|---|---|---|
| `cliente_nome` | 0.25 | Dado de identificação central |
| `reu_texto` | 0.25 | Base para normalização de réu |
| `vara` | 0.20 | Base para todos os indicadores de dashboards |
| `data_distribuicao` | 0.15 | Necessária para cálculo de prazo |
| `sistema` detectado | 0.15 | Confirma que o formato foi reconhecido |
| `numero` ausente | → 0.0 | Sem número não há anti-dup — dado inútil |

### Alertas possíveis

| Alerta | Significado | Ação sugerida |
|---|---|---|
| `null` | Tudo ok | — |
| `pdf_possivelmente_escaneado` | Menos de 50 chars extraídos | Baixar PDF nativo do tribunal |
| `formato_nao_reconhecido` | Sistema = DESCONHECIDO | Reportar ao dev — parser novo pode ser necessário |
| `numero_nao_encontrado` | Regex não achou o número | Verificar se é PDF correto |
| `materia_fora_da_lista` | Matéria não está em `materias_validas` | Avisar adm — pode ser tese nova |
| `erro_leitura` | Falha ao abrir o arquivo | PDF corrompido |

### Tela de revisão manual (para confidence < 0.6)

Quando um PDF retorna confidence baixo, o registro vai para uma tela de **Revisão de Extração** (dentro de Configurações ou como notificação). A adm vê:

- O nome do arquivo
- Os campos que foram extraídos (verde) e os que faltaram (vermelho)
- O alerta específico
- Formulário para completar manualmente e confirmar o insert

Isso garante que nenhum dado de confiança duvidosa entra no banco automaticamente.

### Expandindo para novos formatos (outros estados/tribunais)

Quando um novo formato aparecer e o confidence retornar baixo com `alerta: "formato_nao_reconhecido"`:

1. O dev recebe o log do alerta com o texto extraído pelo `pdfplumber`
2. Analisa o layout (ou usa LLM para sugerir os regex necessários)
3. Adiciona o parser em `extract_core.py`
4. Roda `pytest tests/` — todos os formatos existentes devem continuar passando
5. Merge → sem mudança no NestJS nem no banco

O microserviço Python é versionado (`version` no `server.py`). O NestJS pode verificar a versão no `/health` para garantir compatibilidade.

### Rodar localmente (dev)

```bash
cd skill
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 5001 --reload

# Testar
curl -X POST http://localhost:5001/extract \
  -H "X-Skill-Key: dev-key" \
  -F "file=@/caminho/para/processo.pdf" \
  -F 'config_json={"mapa_comarcas":{"0001":"SSA"},"login_map":{}}'
```

### Rodar testes

```bash
cd skill
pytest tests/ -v

# Para rodar só unitários (sem PDFs físicos)
pytest tests/ -v -k "not TJBA and not Federal"
```

---

## 10. Worker assíncrono

### Filas BullMQ

| Fila | Processor | Concurrency | Descrição |
|---|---|---|---|
| `pdf-extraction` | `pdf.processor.ts` | 3 | Recebe buffer do PDF, chama skill, insere processo |
| `retencao-dados` | `retencao.processor.ts` | 1 | Job diário às 02:00 — limpa histórico/lixeira |
| `comunica-webhook` | `comunica.processor.ts` | 5 | Processa publicações do CNJ |
| `audit-log` | `audit.processor.ts` | 2 | Persiste audit log sem afetar latência do request |
| `notificacoes` | `notificacoes.processor.ts` | 3 | Notificações in-app |

### PDF processor

O worker recebe o buffer do PDF (não o caminho — evita dependência de filesystem compartilhado), busca a config do escritório e chama o microserviço skill via HTTP.

```typescript
// apps/api/src/workers/pdf.processor.ts
@Processor('pdf-extraction')
export class PdfProcessor {
  constructor(
    private readonly httpService: HttpService,
    private readonly escritorioService: EscritorioService,
    private readonly processosService: ProcessosService,
    private readonly storageService: StorageService,
    private readonly revisaoService: RevisaoService,
  ) {}

  @Process()
  async handle(job: Job<PdfJobData>) {
    const { fileBuffer, filename, escritorioId, uploadedBy } = job.data;

    // Config do escritório (cached no Redis, TTL 5min)
    const skillConfig = await this.escritorioService.getSkillConfig(escritorioId);

    // Chama microserviço Python
    const form = new FormData();
    form.append('file', new Blob([Buffer.from(fileBuffer)], { type: 'application/pdf' }), filename);
    form.append('config_json', JSON.stringify(skillConfig));

    const { data: resultado } = await this.httpService.axiosRef.post(
      `${process.env.SKILL_URL}/extract`,
      form,
      { headers: { 'X-Skill-Key': process.env.SKILL_API_KEY } },
    );

    // Decisão por confidence
    if (resultado.confidence === 0) {
      await this.storageService.uploadPdf(fileBuffer, escritorioId, filename);
      throw new Error(resultado.alerta || resultado.erro);
    }

    if (resultado.confidence < 0.6) {
      await this.revisaoService.criar({ resultado, escritorioId, uploadedBy, filename });
      return { status: 'revisao_pendente' };
    }

    // Insert com anti-dup
    await this.processosService.upsertFromSkill(
      resultado.processo,
      escritorioId,
      resultado.confidence < 0.8,  // flag requer_conferencia
    );

    // Arquiva PDF no Supabase Storage
    await this.storageService.uploadPdf(fileBuffer, escritorioId, filename);

    return { status: 'inserido', confidence: resultado.confidence };
  }
}
```

### Config da skill cacheada no Redis

```typescript
// apps/api/src/escritorios/escritorio.service.ts
async getSkillConfig(escritorioId: string): Promise<SkillConfig> {
  const cacheKey = `skill_config:${escritorioId}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const escritorio = await this.db
    .select({ config: escritorioTable.config })
    .from(escritorioTable)
    .where(eq(escritorioTable.id, escritorioId))
    .limit(1);

  const config = {
    mapa_comarcas:    escritorio[0].config.mapa_comarcas ?? {},
    login_map:        escritorio[0].config.login_map ?? {},
    materias_validas: escritorio[0].config.materias_validas ?? [],
    fase_inicial:     escritorio[0].config.fase_inicial ?? 'AUDIÊNCIA AGENDADA',
    situacao_inicial: escritorio[0].config.situacao_inicial ?? 'ATIVO',
  };

  await this.redis.set(cacheKey, JSON.stringify(config), 'EX', 300); // 5min
  return config;
}

// Invalida o cache quando o escritório atualiza as configurações
async invalidarCacheSkill(escritorioId: string) {
  await this.redis.del(`skill_config:${escritorioId}`);
}
```

### Retention processor (job diário às 02:00)

```typescript
@Processor('retencao-dados')
export class RetencaoProcessor {
  @Process('cleanup')
  async handle() {
    const db = this.drizzleService.db;

    // pendencia_historico: 60 dias
    await db.delete(pendenciaHistorico)
      .where(lt(pendenciaHistorico.createdAt, subDays(new Date(), 60)));

    // audiencia_lixeira: 7 dias
    await db.delete(audienciaLixeira)
      .where(lt(audienciaLixeira.createdAt, subDays(new Date(), 7)));

    // comunicacao órfã: 90 dias
    await db.delete(comunicacao)
      .where(
        and(
          isNull(comunicacao.processoId),
          lt(comunicacao.createdAt, subDays(new Date(), 90)),
        )
      );

    // refresh_tokens expirados
    await db.delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()));
  }
}
```

---

## 11. Integração Comunica (CNJ)

### Fluxo de webhook

```
CNJ POST /api/comunica/webhook
        ↓
Valida token de autenticação do CNJ (header Authorization)
        ↓
Adiciona job na fila `comunica-webhook` (responde 200 imediatamente)
        ↓
comunica.processor.ts processa:
  1. Salva comunicação bruta em `comunicacao`
  2. Cruza numero_processo_bruto com `processo` do escritório
  3. Match → executa ação conforme regra configurada (cria pendência / alerta / log)
  4. No-match → status "ORFA" — potencial captação
```

### Configuração por tipo de movimentação

Cada escritório configura em `escritorio.config.comunica_regras`:

```json
{
  "SENTENCA": { "acao": "ALERTA_IMEDIATO", "criar_pendencia": true, "tipo_pendencia": "VERIFICAR SENTENÇA" },
  "INTIMACAO_MANIFESTACAO": { "acao": "PENDENCIA", "tipo_pendencia": "MANIFESTAR", "prazo_dias": 15 },
  "TRANSITO_JULGADO": { "acao": "ALERTA_IMEDIATO", "criar_pendencia": true, "tipo_pendencia": "PETICIONAR DADOS PARA ALVARÁ" },
  "DESPACHO": { "acao": "DIGEST_DIARIO", "criar_pendencia": false },
  "JUNTADA": { "acao": "DIGEST_DIARIO", "criar_pendencia": false },
  "AUDIENCIA_DESIGNADA": { "acao": "ALERTA_IMEDIATO", "sincronizar_audiencia": true }
}
```

---

## 12. Segurança e observabilidade

### Camadas de segurança

| Camada | Mecanismo | Configuração |
|---|---|---|
| Headers HTTP | Helmet | CSP, HSTS, X-Frame-Options, etc. |
| Rate limiting | `@nestjs/throttler` + Redis | 100 req/min global, 5/min em login |
| CORS | Lista explícita de origens | Env `CORS_ORIGINS` |
| Auth | JWT RS256 (assimétrico) | Access 15min, Refresh 7d com rotation |
| Multi-tenancy | `escritorio_id` em toda query | TenantInterceptor + revisão obrigatória |
| SQL injection | Drizzle parameterized queries | Nunca interpolação de string em SQL |
| XSS | React escaping nativo + CSP | — |
| Upload | Validação MIME + tamanho máximo | PDF apenas, max 10MB por arquivo |
| CPF/Telefone | AES-256-GCM at rest | Chave em env `APP_ENCRYPTION_KEY` |
| TLS | Obrigatório em todas as rotas | Infra level (Railway/Vercel) |
| Audit log | Toda alteração crítica registrada | `audit_log` retido 5 anos |
| Secrets | Nunca no código | `.env` local + Railway env vars |

### Sentry — Backend

```typescript
// common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    // Envia para Sentry com contexto de tenant
    Sentry.withScope((scope) => {
      scope.setUser({ id: request.user?.id, email: request.user?.email });
      scope.setTag('escritorio_id', request.tenant?.escritorioId);
      scope.setTag('route', request.url);
      Sentry.captureException(exception);
    });

    // Resposta padronizada
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    ctx.getResponse().status(status).json({
      statusCode: status,
      message: status === 500 ? 'Erro interno' : (exception as any).message,
    });
  }
}
```

### Sentry — Frontend

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV,
  tracesSampleRate: 0.05,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,  // Replay só em erro
  integrations: [
    Sentry.replayIntegration(),
  ],
  beforeSend(event) {
    // Remove dados sensíveis antes de enviar
    if (event.request?.data) {
      delete event.request.data.senha;
      delete event.request.data.cpf;
    }
    return event;
  },
});
```

### Logging estruturado (Pino)

```typescript
// Cada log tem: level, timestamp, requestId, escritorioId, userId, route, duration
{
  "level": "info",
  "time": "2026-05-08T14:32:01.234Z",
  "requestId": "req_abc123",
  "escritorioId": "uuid-escritorio",
  "userId": "uuid-user",
  "route": "PATCH /api/processos/uuid",
  "duration": 47,
  "msg": "processo atualizado"
}
```

### Checklist de segurança antes de cada deploy

- [ ] `npm audit` sem vulnerabilidades críticas
- [ ] Nenhuma secret hardcoded (`git secret scan` ou `gitleaks`)
- [ ] Rate limits testados em staging
- [ ] 2 escritórios de teste — verificar isolamento de dados
- [ ] Sentry recebendo eventos de staging
- [ ] TLS ativo (HTTPS forçado)
- [ ] Headers de segurança verificados (securityheaders.com)

---

## 13. Variáveis de ambiente

**Templates versionados:** `apps/api/.env.example` e `apps/web/.env.example`. Copie para **`apps/api/.env`** e **`apps/web/.env.local`** na sua máquina — os `.env` reais ficam fora do Git (`.gitignore`).

### Backend (`apps/api/.env`)

```env
# Banco
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres

# Auth
JWT_SECRET=<mínimo 64 chars random>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<diferente do access, mínimo 64 chars>
JWT_REFRESH_EXPIRES_IN=7d

# Criptografia de campos sensíveis
APP_ENCRYPTION_KEY=<32 bytes hex>
APP_ENCRYPTION_IV_SALT=<16 bytes hex>

# Redis (BullMQ + rate limiting)
REDIS_URL=redis://localhost:6379

# Supabase Storage
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_STORAGE_BUCKET=conectar-pdfs

# Skill Python (microserviço)
SKILL_URL=http://localhost:5001
SKILL_API_KEY=<chave compartilhada entre NestJS e o microserviço Python>

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# App
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://app.conectar.com.br

# Email (recuperação de senha)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@conectar.com.br
SMTP_PASS=<app password>
```

### Frontend (`apps/web/.env.local`)

Produção (API em domínio próprio):

```env
NEXT_PUBLIC_API_URL=https://api.conectar.com.br
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_ENV=production
```

Dev local com **rewrite** do Next para o Nest (cookies httpOnly na mesma origem) — alinhado ao `apps/web/.env.example` atual:

```env
API_INTERNAL_URL=http://127.0.0.1:3001
NEXT_PUBLIC_API_BASE=/backend
```

---

## 14. Deploy e infraestrutura

### Stack de produção

```
                    ┌─────────────────────────┐
                    │         Usuário          │
                    └────────────┬────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │     Vercel (frontend)    │
                    │   Next.js App Router     │
                    │   Região: São Paulo      │
                    └────────────┬────────────┘
                                 │ HTTPS /api/*
                    ┌────────────▼────────────┐
                    │   Railway (backend)      │
                    │   NestJS + BullMQ        │
                    │   Região: São Paulo      │
                    └──────┬──────────┬───────┘
                           │          │
           ┌───────────────▼──┐  ┌───▼────────────────┐
           │  Supabase (SP)   │  │  Upstash Redis (SP) │
           │  Postgres 15     │  │  BullMQ + throttler │
           │  Storage (PDFs)  │  └─────────────────────┘
           └──────────────────┘
```

### GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm run lint -w api
      - run: npm run build -w api

  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm run lint -w web
      - run: npm run build -w web
```

### Docker Compose (dev local)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: conectar
      POSTGRES_USER: conectar
      POSTGRES_PASSWORD: conectar
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  skill:
    build:
      context: ./skill
      dockerfile: Dockerfile
    ports:
      - "5001:5001"
    environment:
      SKILL_API_KEY: dev-key
      LOG_LEVEL: debug
    volumes:
      - ./skill:/app   # hot reload em dev

volumes:
  postgres_data:
```

### Dockerfile da skill

```dockerfile
# skill/Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5001", "--workers", "1"]
```

### Diagrama de produção (atualizado com skill)

```
                    ┌─────────────────────────┐
                    │         Usuário          │
                    └────────────┬────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │     Vercel (frontend)    │
                    └────────────┬────────────┘
                                 │ HTTPS /api/*
                    ┌────────────▼────────────┐
                    │   Railway (NestJS API)   │◄──── BullMQ workers
                    └──────┬──────────┬───────┘
                           │          │  HTTP interno
           ┌───────────────▼──┐  ┌───▼──────────────────┐
           │  Supabase (SP)   │  │  Railway (skill)      │
           │  Postgres 15     │  │  FastAPI + pdfplumber │
           │  Storage PDFs    │  │  porta 5001 (interno) │
           └──────────────────┘  └──────────────────────┘
                    │
           ┌────────▼──────────┐
           │  Upstash Redis    │
           │  BullMQ + cache   │
           └───────────────────┘
```

A skill roda no mesmo projeto Railway como serviço separado (não exposto publicamente — só acessível internamente pelo NestJS). Custo adicional: ~$2-5/mês para o container Python (128MB RAM é suficiente).

---

## 15. Seed inicial

### Origem dos dados

O seed não usa dados da planilha operacional (sem acesso). Usa os dados de configuração
hardcoded no `extract_projudi_LATEST.py` — que são exatamente a estrutura do escritório-cliente zero.

| Dado | Fonte no arquivo Python | Destino no banco |
|---|---|---|
| Comarcas | `MAPA_COMARCAS` | Tabela `comarca` |
| Advogados | Valores canônicos do `LOGIN_MAP_SKILL` | Tabela `usuario` + `login_aliases[]` |
| Teses | `MATERIAS_VALIDAS` | `escritorio.config.materias_validas` |

Os processos operacionais (800+ processos, pendências, audiências) **não entram no seed**.
Entram depois via `POST /api/import/processos` (CSV) — endpoint já previsto no M0.

### Arquivo de seed

```
api/src/db/seeds/
├── seed_inicial.ts    # escritório + comarcas + usuários — roda uma vez
└── README.md          # instruções
```

Rodar (na **raiz** do monorepo, com Postgres e `apps/api/.env` configurados):

```bash
npm run db:push   # aplica schema Drizzle
npm run db:seed   # seed idempotente por CNPJ
```

Equivalente direto na workspace: `npm run db:seed -w api`.

### Conteúdo do seed

**Escritório (ajustar antes de rodar):**
```typescript
const ESCRITORIO = {
  nome: 'Nome do Escritório',
  cnpj: '00.000.000/0001-00',
  config: {
    materias_validas: [
      'NEGATIVAÇÃO', 'CONTA CANCELADA', 'CREFISA-BOLSA F.',
      'REGISTRATO', 'SERASA', 'PESSOAL', 'APOSENTADOS',
      'VAZAMENTO DADOS NEON', 'EMBASA',
    ],
    fase_inicial: 'AUDIÊNCIA AGENDADA',
    situacao_inicial: 'ATIVO',
  },
};
```

**Comarcas (direto do `MAPA_COMARCAS` do extract_projudi):**
```typescript
const COMARCAS = [
  { codigo: '0001', nome: 'Salvador',            abreviado: 'SSA' },
  { codigo: '0004', nome: 'Alagoinhas',           abreviado: 'ALAGOINHAS' },
  { codigo: '0039', nome: 'Feira de Santana',     abreviado: 'F. DE SANTANA' },
  { codigo: '0044', nome: 'Camaçari',             abreviado: 'CAMACARI' },
  { codigo: '0075', nome: 'Encruzilhada',         abreviado: 'ENCRUZILHADA' },
  { codigo: '0080', nome: 'Itabuna',              abreviado: 'ITABUNA' },
  { codigo: '0103', nome: 'Teixeira de Freitas',  abreviado: 'TEIXEIRA DE FREITAS' },
  { codigo: '0113', nome: 'Vitória da Conquista', abreviado: 'VIT. DA CONQUISTA' },
  { codigo: '0146', nome: 'Porto Seguro',         abreviado: 'PORTO SEGURO' },
  { codigo: '0150', nome: 'Ilhéus',               abreviado: 'ILHEUS' },
  { codigo: '0208', nome: 'Remanso',              abreviado: 'REMANSO' },
  { codigo: '0238', nome: 'Lauro de Freitas',     abreviado: 'LAURO' },
  { codigo: '0250', nome: 'Simões Filho',         abreviado: 'SIMOES FILHO' },
  { codigo: '0274', nome: 'Eunápolis',            abreviado: 'EUNAPOLIS' },
];
```

**Usuários (valores canônicos únicos do `LOGIN_MAP_SKILL`):**
```typescript
// perfil: 'adm' como default — admin ajusta depois na tela de usuários
// senha_hash: bcrypt de uma senha temporária enviada por email
const USUARIOS = [
  { nome: 'TAINARA',           login_aliases: ['TAINARA'] },
  { nome: 'TAINÁ',             login_aliases: ['TAINÁ', 'TAINA'] },
  { nome: 'ANDRÉ PITA',        login_aliases: ['ANDRÉ PITA', 'ANDRE PITA', 'ANDRÉ', 'ANDRE', 'ANDRE GABRIEL', 'ANDRÉ GABRIEL'] },
  { nome: 'ANTONIO FERNANDO',  login_aliases: ['ANTONIO FERNANDO', 'ANTÔNIO FERNANDO'] },
  { nome: 'FERNANDO',          login_aliases: ['FERNANDO', 'FERANDO'] },
  { nome: 'MURILO',            login_aliases: ['MURILO'] },
  { nome: 'LÚCIO',             login_aliases: ['LÚCIO', 'LUCIO'] },
  { nome: 'GABRIELLE',         login_aliases: ['GABRIELLE', 'GABRIELLE SANTANA'] },
  { nome: 'LÍVIA',             login_aliases: ['LÍVIA', 'LIVIA'] },
  { nome: 'EURIDICE',          login_aliases: ['EURIDICE', 'EURÍDICE'] },
  { nome: 'LUIZ ROCHA',        login_aliases: ['LUIZ ROCHA'] },
  { nome: 'LUCAS GARCIA',      login_aliases: ['LUCAS GARCIA'] },
  { nome: 'RORIZ',             login_aliases: ['RORIZ'] },
  { nome: 'ANDRE LUIZ',        login_aliases: ['ANDRE LUIZ', 'ANDRÉ LUIZ'] },
];
```

### Fluxo pós-seed para importar dados operacionais

```
1. Seed roda → escritório + comarcas + usuários no banco
2. Admin faz login com usuário criado no seed
3. Admin acessa /importacao
4. Faz upload do CSV exportado da planilha Google Sheets
5. Sistema importa processos, pendências, audiências com relatório de erros
6. Admin confere o relatório e corrige manualmente o que falhou
```

---

## 16. Origem dos projetos de referência

### `sistema_ocorrencias` — o que reaproveitamos diretamente

| O que | Onde fica no CONECTAR |
|---|---|
| Estrutura de módulos NestJS | `apps/api/src/*` — padrão module/controller/service/dto |
| Auth module (JWT + Passport) | `apps/api/src/auth/` — adaptar para adicionar `escritorioId` no payload |
| Guards (`JwtAuthGuard`, `RolesGuard`) | `apps/api/src/common/guards/` |
| Decorators (`@CurrentUser`, `@Roles`) | `apps/api/src/common/decorators/` |
| BullMQ setup | `apps/api/src/workers/` |
| `main.ts` (CORS, ValidationPipe) | Extender com Helmet, rate limiting, Sentry |
| Estrutura Next.js App Router | `apps/web/app/(app)/...` — mesma convenção de route groups |
| `middleware.ts` | Adaptar para cookie name `conectar_token` |
| `lib/api.ts` e `lib/api-base.ts` | Axios client com interceptors de auth |
| Zustand store de auth | Extender com `escritorioId` e `perfil` |
| `globals.css` (variáveis CSS, scrollbar, animações) | Substituir paleta conforme § 4 |
| shadcn/ui components | Copiar pasta `components/ui/` — sem dependência de lib |

### Diferença principal de arquitetura

O `sistema_ocorrencias` usa **Prisma**. O CONECTAR usa **Drizzle**. O padrão de `PrismaService` (`src/prisma/prisma.service.ts`) é substituído por um `DrizzleService` que expõe a conexão do `drizzle-orm/node-postgres`.

### Skill Python — referência

A skill em `PROTOCOLOS_AUTOMACAO_ATUAL/_motor/extract_projudi_LATEST.py` é copiada para `skill/extract_projudi_LATEST.py` no monorepo. A única modificação necessária é adicionar o modo de output `--json` para o worker Node.js consumir. Todo o core de extração permanece intacto.

---

*Documento gerado em 2026-05-08. Atualizar conforme decisões de implementação evoluem.*
