import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Marketing pages that should be accessible on www/root domain
const MARKETING_PATHS = ['/', '/arena', '/leaderboard', '/discover'];

// App paths that require the app subdomain
const APP_PATHS = ['/dashboard', '/agents', '/api'];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Check if we're on the app subdomain
  const isAppSubdomain = hostname.startsWith('app.');

  // Check if we're on the www or root domain
  const isMarketingDomain = hostname.startsWith('www.') ||
    (!hostname.startsWith('app.') && !hostname.includes('localhost'));

  // Handle app.agentiom.com
  if (isAppSubdomain) {
    // Redirect root of app subdomain to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Block marketing pages on app subdomain - redirect to dashboard
    if (MARKETING_PATHS.includes(pathname) && pathname !== '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Handle www.agentiom.com / agentiom.com
  if (isMarketingDomain && !hostname.includes('localhost') && !hostname.includes('vercel.app')) {
    // Redirect app paths to app subdomain
    const isAppPath = APP_PATHS.some(path => pathname.startsWith(path));
    if (isAppPath) {
      const appUrl = new URL(request.url);
      appUrl.hostname = hostname.replace('www.', 'app.').replace(/^([^.]+)\./, 'app.');
      if (!appUrl.hostname.startsWith('app.')) {
        appUrl.hostname = 'app.' + appUrl.hostname;
      }
      return NextResponse.redirect(appUrl);
    }
  }

  // Continue with Supabase session handling
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
