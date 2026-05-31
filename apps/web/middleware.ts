import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Rotas da área logada (PLANO V3 — sidebar). */
const ROTAS_AUTENTICADAS = [
  '/painel',
  '/intimacoes',
  '/procedentes',
  '/recursos',
  '/improcedentes',
  '/reprotocolo',
  '/agenda',
  '/pendencias',
  '/importacao',
  '/atendimento',
  '/comunicacoes',
  '/dashboards',
  '/reus',
  '/bancas',
  '/configuracoes',
  '/ausentes',
  '/audit-log',
  '/migracao-procedentes',
  /** Legado — redirecionam para rotas V3 */
  '/revisoes',
  '/audiencias',
  '/usuarios',
  '/comarcas',
  '/escritorios-adversarios',
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
    '/painel/:path*',
    '/intimacoes/:path*',
    '/procedentes/:path*',
    '/recursos/:path*',
    '/improcedentes/:path*',
    '/reprotocolo/:path*',
    '/agenda/:path*',
    '/pendencias/:path*',
    '/importacao/:path*',
    '/atendimento/:path*',
    '/comunicacoes/:path*',
    '/dashboards/:path*',
    '/reus/:path*',
    '/bancas/:path*',
    '/configuracoes/:path*',
    '/ausentes/:path*',
    '/audit-log/:path*',
    '/migracao-procedentes/:path*',
    '/revisoes/:path*',
    '/audiencias/:path*',
    '/usuarios/:path*',
    '/comarcas/:path*',
    '/escritorios-adversarios/:path*',
  ],
};
