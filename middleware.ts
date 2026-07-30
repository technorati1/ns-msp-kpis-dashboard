import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { isSettingsAllowed } from '@/lib/settings-auth';

export default auth((req) => {
  const isSignedIn = !!req.auth;
  const isSignInPage = req.nextUrl.pathname === '/sign-in';
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  // Exact match only — /api/sync/trigger is a different route and stays behind session auth below.
  const isBearerSyncRoute = req.nextUrl.pathname === '/api/sync';
  const isSettingsPath =
    req.nextUrl.pathname === '/settings' ||
    req.nextUrl.pathname.startsWith('/settings/') ||
    req.nextUrl.pathname.startsWith('/api/settings/');

  if (isAuthRoute || isBearerSyncRoute) return NextResponse.next();
  if (!isSignedIn && !isSignInPage) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
  if (isSignedIn && isSignInPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  if (isSignedIn && isSettingsPath && !isSettingsAllowed(req.auth?.user?.email)) {
    if (req.nextUrl.pathname.startsWith('/api/settings/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
