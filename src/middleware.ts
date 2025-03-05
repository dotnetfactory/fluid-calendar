import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// List of public routes that don't require authentication
const publicRoutes = ["/setup", "/api/setup", "/auth/signin"];

/**
 * Middleware for handling setup page redirection
 * This middleware doesn't use Prisma directly to avoid Edge Runtime issues
 */
export async function middleware(request: NextRequest) {
  // For now, we'll just continue with the request
  // The setup page itself will check if setup is needed using the API
  // In the future, this will handle authentication and role-based access
  return NextResponse.next();
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     * - api routes (to avoid Edge Runtime issues with Prisma)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
