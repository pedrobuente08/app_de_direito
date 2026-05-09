import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Rotas da área logada (mesmas entradas da sidebar em `(app)/layout.tsx`). */
const ROTAS_AUTENTICADAS = [
  '/intimacoes',
  '/revisoes',
  '/comunicacoes',
  '/pendencias',
  '/audiencias',
  '/procedentes',
  '/dashboards',
  '/usuarios',
  '/comarcas',
  '/configuracoes',
  '/importacao',
  '/reus',
] as const;

function precisaAutenticacao(pathname: string): boolean {
  return ROTAS_AUTENTICADAS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('conectar_token')?.value;
  const { pathname } = request.nextUrl;

  if (!precisaAutenticacao(pathname)) {
    return NextResponse.next();
  }

  if (!token) {
    const login = new URL('/login', request.url);
    login.searchParams.set('from', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/intimacoes/:path*',
    '/revisoes/:path*',
    '/comunicacoes/:path*',
    '/pendencias/:path*',
    '/audiencias/:path*',
    '/procedentes/:path*',
    '/dashboards/:path*',
    '/usuarios/:path*',
    '/comarcas/:path*',
    '/configuracoes/:path*',
    '/importacao/:path*',
    '/reus/:path*',
  ],
};
