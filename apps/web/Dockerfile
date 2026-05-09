# Frontend Next.js — build a partir da RAIZ do monorepo (`app_de_direito/`).
#
# Coolify: Build Pack = Dockerfile
#   Dockerfile: apps/web/Dockerfile
#   Context (diretório de build): .  (raiz do repositório, não apps/web)
#
# Build arg obrigatório em produção: URL interna que o Next usa no rewrite
# `/backend/*` → API (mesmo valor que API_INTERNAL_URL no runtime do web).
# Ex. rede Docker: http://nome-do-servico-api:3001
ARG API_INTERNAL_URL=http://127.0.0.1:3001

FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps ./apps

RUN npm ci

ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

RUN npm run build -w web

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Opcional em runtime; o rewrite já foi “congelado” no build com API_INTERNAL_URL do estágio builder.
# Mantido para consistência com next.config (variáveis usadas no build).
ARG API_INTERNAL_URL=http://127.0.0.1:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
