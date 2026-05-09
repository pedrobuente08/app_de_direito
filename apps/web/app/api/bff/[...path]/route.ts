import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Proxy same-origin → Nest (`/api/*`) para cookies httpOnly funcionarem no domínio do Next.
 * Usado quando `NEXT_PUBLIC_API_BASE` é URL absoluta de outro host (browser chama `/api/bff/...`).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `NEXT_PUBLIC_*` é substituído no build; em Docker sem ARG fica `undefined` no servidor.
 * Acesso dinâmico lê o valor injetado em runtime (Coolify) no container.
 */
function readNextPublicApiBaseRuntime(): string {
  const k = 'NEXT_PUBLIC_' + 'API_BASE';
  return String(process.env[k] ?? '').trim();
}

/**
 * URL base do Nest vista **pelo servidor Next** (fetch no route handler).
 * Em produção: defina `API_INTERNAL_URL` (recomendado) ou garanta `NEXT_PUBLIC_API_BASE` https no **runtime**.
 */
function internalApiOrigin(): string | null {
  const explicit = (process.env.API_INTERNAL_URL || process.env.INTERNAL_API_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const pub = readNextPublicApiBaseRuntime();
  if (pub.startsWith('http://') || pub.startsWith('https://')) {
    try {
      return new URL(pub).origin.replace(/\/$/, '');
    } catch {
      /* inválido */
    }
  }

  if (process.env.NODE_ENV === 'production') return null;
  return 'http://127.0.0.1:3001';
}

async function proxy(req: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const origin = internalApiOrigin();
  if (!origin) {
    return NextResponse.json(
      {
        statusCode: 503,
        message:
          'BFF sem destino: no serviço Next defina API_INTERNAL_URL (ex.: https://api.seudominio.com ou http://api:3001) ' +
          'ou NEXT_PUBLIC_API_BASE com URL https no runtime do container (não só no build).',
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
