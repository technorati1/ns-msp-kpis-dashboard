import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isSignedIn = !!req.auth;
  const isSignInPage = req.nextUrl.pathname === '/sign-in';
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');

  if (isAuthRoute) return NextResponse.next();
  if (!isSignedIn && !isSignInPage) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
  if (isSignedIn && isSignInPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
