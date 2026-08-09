import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-lb-locale', request.nextUrl.pathname === '/en' || request.nextUrl.pathname.startsWith('/en/') ? 'en' : 'es');
  return updateSession(request, requestHeaders);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|mp4)$).*)'],
};
