import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Proxy same-origin → Nest (`/api/*`) para cookies httpOnly funcionarem no domínio do Next.
 * Usado quando `NEXT_PUBLIC_API_BASE` é URL absoluta de outro host (browser chama `/api/bff/...`).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `NEXT_PUBLIC_*` pode ser substituído no build do servidor; tentamos chaves dinâmicas + Reflect.
 */
function readNextPublicApiBaseRuntime(): string {
  const env = process.env as Record<string, string | undefined>;
  const splitKey = 'NEXT_PUBLIC_' + 'API_BASE';
  const v =
    Reflect.get(env, 'NEXT_PUBLIC_API_BASE') ??
    env[splitKey] ??
    '';
  return String(v).trim();
}

/** Só scheme+host+port. `https://host/api` → `https://host` (o BFF acrescenta `/api/...`). */
function httpOriginOnly(raw: string): string | null {
  const s = raw.trim();
  if (!s.startsWith('http://') && !s.startsWith('https://')) return null;
  try {
    return new URL(s).origin;
  } catch {
    return null;
  }
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const h = new URL(origin).hostname;
    return h === '127.0.0.1' || h === 'localhost' || h === '[::1]';
  } catch {
    return false;
  }
}

/**
 * URL base do Nest vista **pelo servidor Next** (fetch no route handler).
 * Coolify: `SERVER_API_ORIGIN` ou `NEXT_PUBLIC_API_BASE` em runtime. Evita `API_INTERNAL_URL=127.0.0.1` herdado do Docker.
 */
function internalApiOrigin(): string | null {
  const explicit = (
    process.env.SERVER_API_ORIGIN ||
    process.env.API_INTERNAL_URL ||
    process.env.INTERNAL_API_URL ||
    ''
  ).trim();
  if (explicit) {
    const o = httpOriginOnly(explicit);
    if (o) {
      const allowLoop =
        process.env.NODE_ENV === 'development' || process.env.BFF_ALLOW_LOOPBACK === '1';
      if (!isLoopbackOrigin(o) || allowLoop) return o;
    }
  }

  const pub = readNextPublicApiBaseRuntime();
  if (pub.startsWith('http://') || pub.startsWith('https://')) {
    const o = httpOriginOnly(pub);
    if (o) return o;
  }

  if (process.env.NODE_ENV === 'development') return 'http://127.0.0.1:3001';
  return null;
}

async function proxy(req: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const origin = internalApiOrigin();
  if (!origin) {
    return NextResponse.json(
      {
        statusCode: 503,
        message:
          'BFF sem destino: no serviço Next defina SERVER_API_ORIGIN ou API_INTERNAL_URL (ex.: https://api.seudominio.com — pode incluir /api no path) ' +
          'ou NEXT_PUBLIC_API_BASE=https://... em runtime.',
      },
      { status: 503 },
    );
  }

  const pathPart = pathSegments.map(encodeURIComponent).join('/');
  const target = `${origin}/api/${pathPart}${req.nextUrl.search}`;

  const h = new Headers();
  const forwardNames = [
    'cookie',
    'content-type',
    'accept',
    'accept-language',
    'authorization',
    'x-skill-key',
  ];
  for (const name of forwardNames) {
    const v = req.headers.get(name);
    if (v) h.set(name, v);
  }

  const init: RequestInit & { duplex?: string } = {
    method: req.method,
    headers: h,
    redirect: 'manual',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    init.duplex = 'half';
  }

  const upstream = await fetch(target, init);

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  const ct = upstream.headers.get('content-type');
  if (ct) res.headers.set('content-type', ct);

  const cookies = upstream.headers.getSetCookie?.() ?? [];
  for (const c of cookies) {
    res.headers.append('set-cookie', c);
  }

  return res;
}

type RouteCtx = { params: { path: string[] } };

function segments(ctx: RouteCtx): string[] {
  return ctx.params.path ?? [];
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}
