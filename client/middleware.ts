import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./app/utils/supabase/middleware";
import { type NextRequest } from "next/server";

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // First handle authentication
  const authResponse = await updateSession(request);
  
  // If auth middleware redirected, return that response
  if (authResponse.status !== 200) {
    return authResponse;
  }
  
  // Otherwise, apply internationalization
  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
