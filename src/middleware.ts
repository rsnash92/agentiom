import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Check if we're on the app subdomain
  const isAppSubdomain = hostname.startsWith('app.');

  // Handle app.agentiom.com - redirect root to dashboard
  if (isAppSubdomain && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow all other requests to continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (let them pass through)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
