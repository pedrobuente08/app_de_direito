# Variáveis de ambiente — deploy demo (sócio visualizar)

## Coolify / Docker — frontend (“no frontend” no Nixpacks)

O Nixpacks na **raiz** do repo não detecta Next.js (o app está em `apps/web`). Use **Dockerfile** em vez de Nixpacks automático:

| Campo | Valor |
|--------|--------|
| **Dockerfile** | `apps/web/Dockerfile` |
| **Context / diretório de build** | `.` (raiz do monorepo `app_de_direito/`, **não** `apps/web`) |

**Build argument:** `API_INTERNAL_URL` — URL que o servidor Next usa para encaminhar `/backend/*` à API (ex.: `http://api:3001` com o hostname **interno** do serviço da API no Coolify). Deve ser o mesmo em **build** e no ambiente em que o container roda.

Variáveis de **runtime** no serviço do front (Coolify → Environment):

- `PORT` — normalmente `3000` (já é o default da imagem).
- `NEXT_PUBLIC_API_BASE` — use `/backend` no mesmo host do Next **ou** omita (o código volta para `/backend`). **Nunca** defina como string vazia no Coolify.

### Coolify / Docker — skill (`skill/`)

Se o deploy falhar com **`open Dockerfile: no such file or directory`**, o Coolify está procurando **`Dockerfile` na raiz**; o arquivo antigo da skill fica em **`skill/Dockerfile`** (contexto só da pasta `skill/`).

Use o Dockerfile na **raiz do monorepo**:

| Campo | Valor |
|--------|--------|
| **Dockerfile** | `Dockerfile.skill` |
| **Context / diretório de build** | `.` (raiz do repo `app_de_direito/`) |

Porta do container: **5001** (mapeie no Coolify se expuser HTTP). Variáveis opcionais: `SKILL_API_KEY`, `LOG_LEVEL` (ver secção 3 abaixo).

**Alternativa:** em vez de `Dockerfile.skill`, defina **Base Directory** = `skill` e **Dockerfile** = `Dockerfile` (aí usa o `skill/Dockerfile` original com contexto `skill/`).

---

Banco **Postgres no Supabase** (você só precisa da `DATABASE_URL`). Para uma demo rápida **não é obrigatório** Redis, SMTP nem Supabase Storage — a API sobe sem `REDIS_URL` e o upload de PDF pode usar o fluxo síncrono que chama a skill direto (conforme sua versão do código).

Copie cada bloco para o serviço correspondente no Coolify (ou `.env` local de deploy). **Não commite** arquivos `.env` com valores reais.

---

## 1. Backend — NestJS (`apps/api`)

| Variável | Obrigatório (demo) | Descrição |
|----------|-------------------|-----------|
| `DATABASE_URL` | **Sim** | Connection string Postgres do Supabase (Settings → Database). Preferência: **pooler** (porta `6543`, modo transaction) para serverless/PaaS; **direct** (`5432`) se o host tiver conexão estável longa. |
| `JWT_SECRET` | **Sim** | String longa e aleatória (ex.: 64+ caracteres). |
| `JWT_REFRESH_SECRET` | **Sim** | Outra string longa, **diferente** da anterior. |
| `PORT` | Não | Padrão `3001`. |
| `NODE_ENV` | Recomendado | `production` em deploy. |
| `CORS_ORIGINS` | **Sim** | URL **pública** do front (com `https://`). Várias origens: separadas por vírgula, sem espaço extra. Ex.: `https://app.seudominio.com` |
| `SKILL_URL` | **Sim** se for usar PDF | URL interna ou pública da skill, **sem barra no final**. No Docker/Coolify: `http://nome-do-servico-skill:5001`. |
| `SKILL_API_KEY` | Opcional | Se preencher, use **o mesmo valor** na skill (`SKILL_API_KEY`). A API envia `X-Skill-Key`. |

**Opcional (demo pode deixar vazio)**

| Variável | Uso |
|----------|-----|
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Padrões: `15m` e `7d`. |
| `REDIS_URL` | Fila BullMQ de PDF; omita na demo se não for usar Redis. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Fluxo com storage + fila; omita se não configurar. |
| `SMTP_*` / `SMTP_FROM` | E-mail “esqueci senha”. |
| `FRONTEND_PASSWORD_RESET_URL` | URL completa da página de redefinição, ex.: `https://app.seudominio.com/redefinir-senha`. Se vazio, pode usar `APP_PUBLIC_WEB_URL`. |
| `APP_PUBLIC_WEB_URL` | Base pública do front (ex.: `https://app.seudominio.com`) — fallback no link do e-mail de senha. |
| `PLATFORM_JWT_SECRET` / `PLATFORM_BOOTSTRAP_SECRET` | Rotas superadmin `/admin/*`; deixe vazio se não for usar admin da plataforma na demo. |

### Exemplo (valores fictícios — substitua)

```env
# --- Supabase Postgres ---
DATABASE_URL=postgresql://postgres.[REF]:[SUA_SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

JWT_SECRET=substitua-por-64-plus-caracteres-aleatorios
JWT_REFRESH_SECRET=outro-segredo-longo-e-diferente-do-jwt-secret

PORT=3001
NODE_ENV=production

# URL exata do navegador onde o front roda
CORS_ORIGINS=https://app.exemplo.com

# Skill (rede interna Docker ou URL pública temporária)
SKILL_URL=http://skill:5001
# SKILL_API_KEY=mesmo-valor-na-skill

# Demo sem Redis / sem fila
# REDIS_URL=

FRONTEND_PASSWORD_RESET_URL=https://app.exemplo.com/redefinir-senha
# APP_PUBLIC_WEB_URL=https://app.exemplo.com
```

Após definir `DATABASE_URL`, rode as migrações/push do Drizzle no ambiente de deploy (`npm run db:push -w api` ou o comando que vocês usarem no CI).

---

## 2. Frontend — Next.js (`apps/web`)

| Variável | Obrigatório (demo) | Descrição |
|----------|-------------------|-----------|
| `NEXT_PUBLIC_API_BASE` | **Sim** | Onde o **browser** chama a API. **`/backend`** se o Next fizer rewrite no mesmo domínio (recomendado no Coolify). **Não deixe vazio** — string vazia fazia `POST /auth/login` no Next (“Cannot POST /auth/login”). Se a API for **outro host**, use URL absoluta **com** o prefixo `/api` do Nest, ex.: `https://api.exemplo.com/api` (o código concatena `/auth/login` etc.). |
| `API_INTERNAL_URL` | Se usar rewrite `/backend` | URL que o **servidor Next** usa no build/runtime para proxy (ex.: `http://api:3001` no Docker). No Coolify, costuma ser o hostname interno do serviço da API + porta. |

### Exemplo — front e API no mesmo domínio (rewrite)

```env
NEXT_PUBLIC_API_BASE=/backend
API_INTERNAL_URL=http://api:3001
```

(`next.config.mjs` reescreve `/backend/*` → essa origem.)

### Exemplo — API em subdomínio público (sem rewrite `/backend`)

```env
NEXT_PUBLIC_API_BASE=https://api.exemplo.com/api
```

(CORS na API: inclua a origem exata do front em `CORS_ORIGINS`.)

---

## 3. Skill — Python FastAPI (`skill/`)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `SKILL_API_KEY` | Opcional | Se vazio, endpoint não exige chave. Se definir, **igual** à `SKILL_API_KEY` da API. |
| `LOG_LEVEL` | Opcional | `info` (padrão), `debug`, `warning`. |

### Exemplo

```env
LOG_LEVEL=info
# SKILL_API_KEY=mesmo-valor-configurado-na-api
```

A skill escuta na porta **5001** (Dockerfile / `uvicorn`).

---

## Ordem sugerida para o sócio ver funcionando

1. Subir **Postgres** já está no Supabase — só colar `DATABASE_URL` na API.  
2. Subir **skill** (porta 5001, rede interna com a API).  
3. Subir **API** com `SKILL_URL` apontando para a skill.  
4. Subir **front** com `CORS_ORIGINS` na API batendo com a URL real do front e `NEXT_PUBLIC_API_BASE` coerente com o proxy ou URL da API.  
5. (Opcional) Criar escritório/usuário via fluxo de cadastro ou seed, conforme documentação do projeto.

Se algo falhar no PDF, teste o diagnóstico da API: **`GET https://<sua-api>/api/health/skill`**. Se o front usar rewrite em `/backend`, no browser use **`GET https://<seu-front>/backend/health/skill`** (o Next encaminha para `/api/health/skill` no Nest).
