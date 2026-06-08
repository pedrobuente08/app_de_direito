# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Conectar** — a multi-tenant legal case management SaaS for Brazilian law firms. The system integrates with court notification systems (Comunica/CNJ, DJEN), handles PDF extraction via a microservice, and manages the full lifecycle of legal cases.

## Monorepo Structure

NPM workspaces with three apps:

- `apps/api/` — NestJS backend (port 3001)
- `apps/web/` — Next.js 14 frontend (port 3000)
- `skill/` — FastAPI PDF extraction microservice (port 5001)

## Commands

```bash
# Development (run each in separate terminals)
npm run dev:api          # NestJS with watch mode
npm run dev:web          # Next.js dev server
npm run dev:skill        # FastAPI uvicorn (requires Python venv)

# Database (run from root, targets api workspace)
npm run db:generate      # Generate Drizzle migrations from schema changes
npm run db:push          # Apply migrations to PostgreSQL
npm run db:seed          # Seed initial data

# Build
npm run build            # Builds both api and web
npm run build -w api     # Build only API
npm run build -w web     # Build only web
```

Python skill setup (one-time):
```bash
python3 -m venv skill/.venv && source skill/.venv/bin/activate
pip install -r skill/requirements.txt
```

## Architecture

### Multi-tenancy
Every API request goes through `TenantInterceptor`, which extracts `escritorioId` from the JWT and injects it into all DB queries automatically. Never manually filter by `escritorioId` — the interceptor handles it.

### API (NestJS)
- 30+ domain modules, each with controller/service/module files
- Global guards: `JwtAuthGuard`, `RolesGuard`, `ThrottlerGuard`
- DTOs validated via `class-validator` decorators on all incoming payloads
- Drizzle ORM with TypeScript schema files in `src/db/schema/`; DB column names are snake_case, API responses are camelCase
- Soft deletes via `archivedAt` field (never hard-delete domain entities)
- BullMQ workers in `src/workers/` handle async PDF processing jobs
- Scheduled jobs in `src/jobs/` handle DJEN polling and automated tasks

### Frontend (Next.js 14 App Router)
- Protected app routes live under `app/(app)/`
- All API calls go through `lib/api.ts` (50+ typed fetch functions) — do not call the API directly from components
- Types are centralized in `lib/types.ts` (1000+ LOC) — check here before defining new types
- API requests use the `/backend/*` rewrite (Next.js config proxies to `http://api:3001/api/*`)
- Cross-domain auth uses the BFF route at `app/api/bff/` to capture `Set-Cookie` headers
- TanStack React Table v8 for data grids; Tailwind CSS with `--pauta-*` CSS variables for the design system

### PDF Extraction Flow
File upload → API queues job in BullMQ → Worker calls FastAPI skill at `SKILL_URL` → Extracted data stored → Frontend polls for result. The skill is required for file uploads; configure `SKILL_URL` in the API `.env`.

### Court Integrations
- **Comunica (CNJ)**: Webhook-driven. Incoming notifications auto-create `comunicacao` records and optionally trigger `pendencia` creation.
- **DJEN**: Cron-based polling. Configured per-office with OAB number + comarca window (`CAPTURA_DJEN_DIAS_JANELA`).

### AI Integration
Anthropic Claude is available via `src/ai-gateway/`. Used for extraction review and summarization. Requires `ANTHROPIC_API_KEY`.

## Key Environment Variables

API `.env`:
```
DATABASE_URL=postgresql://...
JWT_SECRET=<64+ chars>
JWT_REFRESH_SECRET=<different from JWT_SECRET>
SKILL_URL=http://127.0.0.1:5001
FRONTEND_PASSWORD_RESET_URL=http://localhost:3000/redefinir-senha
ANTHROPIC_API_KEY=sk-ant-...
COMUNICA_API_BASE_URL=https://comunicaapi.pje.jus.br/api/v1
```

Redis (`REDIS_URL`) and Supabase storage variables are optional — omitting them disables queuing and cloud file storage respectively.

## Domain Vocabulary

Understanding these terms is essential for navigating the codebase:

| Portuguese | Meaning |
|---|---|
| `processo` | Legal case |
| `audiencia` | Court hearing |
| `sentenca` | Judgment/sentence |
| `pendencia` | Task/deadline |
| `comarca` | Court district |
| `vara` | Court division/branch |
| `reu` | Defendant |
| `escritorio` | Law firm (tenant) |
| `comunicacao` | Court system notification |
| `procedente` | Won case (execution phase) |
| `improcedente` | Lost case (appeal phase) |
| `recurso` | Appeal |
| `pautista` | Hearing scheduler role |
| `materia` | Legal subject/area |
| `fase` | Case phase/stage |
| `advogado` | Lawyer |
