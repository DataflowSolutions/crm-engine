import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./app/utils/supabase/middleware";
import { type NextRequest } from "next/server";

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware(routing);

// Cache auth checks for a short period to avoid repeated Supabase calls
const authCache = new Map<string, { isAuthenticated: boolean; timestamp: number }>();
const AUTH_CACHE_TTL = 30 * 1000; // 30 seconds

function getCachedAuth(sessionToken: string): boolean | null {
  const cached = authCache.get(sessionToken);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > AUTH_CACHE_TTL) {
    authCache.delete(sessionToken);
    return null;
  }
  
  return cached.isAuthenticated;
}

function setCachedAuth(sessionToken: string, isAuthenticated: boolean): void {
  authCache.set(sessionToken, {
    isAuthenticated,
    timestamp: Date.now()
  });
}

export async function middleware(request: NextRequest) {
  // Skip auth for static assets and API routes
  const { pathname } = request.nextUrl;
  
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return intlMiddleware(request);
  }

  // Get session token for caching
  const sessionToken = request.cookies.get('sb-access-token')?.value || 
                      request.cookies.get('sb-refresh-token')?.value || 
                      'anonymous';

  // Check cached auth first
  const cachedAuth = getCachedAuth(sessionToken);
  if (cachedAuth !== null) {
    // If cached as authenticated, proceed with i18n
    if (cachedAuth) {
      return intlMiddleware(request);
    }
    // If cached as not authenticated and trying to access protected route
    if (!cachedAuth && !pathname.includes('/login') && !pathname.includes('/auth')) {
      const pathSegments = pathname.split('/').filter(Boolean);
      const possibleLocale = pathSegments[0];
      const isLocaleInPath = ['en', 'sv'].includes(possibleLocale);
      
      const url = request.nextUrl.clone();
      url.pathname = isLocaleInPath ? `/${possibleLocale}/login` : '/login';
      return Response.redirect(url);
    }
  }

  // If not cached, perform auth check
  const authResponse = await updateSession(request);
  
  // Cache the result based on response status
  const isAuthenticated = authResponse.status === 200;
  setCachedAuth(sessionToken, isAuthenticated);
  
  // If auth middleware redirected, return that response
  if (authResponse.status !== 200) {
    return authResponse;
  }
  
  // Apply internationalization and add pathname to headers for server components
  const response = intlMiddleware(request);
  if (response) {
    response.headers.set('x-pathname', pathname);
    return response;
  }
  
  // Fallback response with pathname header
  const newResponse = new Response(null, { status: 200 });
  newResponse.headers.set('x-pathname', pathname);
  return newResponse;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
