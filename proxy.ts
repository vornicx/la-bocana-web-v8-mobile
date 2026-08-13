import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  requestHeaders.set('x-lb-locale', pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'es');

  const needsAuthSession = pathname === '/control'
    || pathname.startsWith('/control/')
    || pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname === '/admin-login'
    || pathname.startsWith('/auth/');

  if (!needsAuthSession) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return updateSession(request, requestHeaders);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|mp4)$).*)'],
};
