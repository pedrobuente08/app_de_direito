# Next.js — contexto de build = pasta `apps/web` (recomendado no Coolify).
#
# Coolify (frontend):
#   Base Directory / Root: apps/web   (ou deixe vazio se o “context” for só apps/web)
#   Dockerfile: Dockerfile   (este arquivo)
#   Context: apps/web
#
# Build arg: URL interna da API para o rewrite `/backend/*` (ex.: http://api:3001)
#
# Build na raiz do repo: docker build -f apps/web/Dockerfile ./apps/web

FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ARG API_INTERNAL_URL=http://127.0.0.1:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

COPY package.json ./
RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_WEB_STANDALONE=1

RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ARG API_INTERNAL_URL=http://127.0.0.1:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./apps/web/.next/static
COPY --from=builder /app/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
