import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('conectar_token')?.value;
  const { pathname } = request.nextUrl;

  if (!token && pathname.startsWith('/intimacoes')) {
    const login = new URL('/login', request.url);
    login.searchParams.set('from', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/intimacoes/:path*'],
};
