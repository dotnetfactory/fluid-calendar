import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// List of public routes that don't require authentication
const publicRoutes = [
  "/setup",
  "/api/setup/check",
  "/auth/signin",
  "/auth/reset-password",
  "/auth/error",
  "/api/auth/register",
  "/beta",
  "/terms",
  "/privacy",
  "/subscription/lifetime/success",
  "/subscription/lifetime/setup-password",
];

// Routes that only admins can access
const adminRoutes = ["/admin", "/logs", "/settings/system"];

/**
 * Get the homepage setting directly from the API
 * This ensures we always have the most up-to-date setting
 */
async function getHomepageSetting(request: NextRequest): Promise<boolean> {
  try {
    // Create a fetch request to our own API endpoint
    const apiUrl = new URL("/api/settings/homepage-disabled", request.url);
    // Add a timestamp to prevent browser/CDN caching
    apiUrl.searchParams.set("t", Date.now().toString());

    const response = await fetch(apiUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Request": "true",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const data = await response.json();
    return !!data.disabled;
  } catch (error) {
    // If API call fails, default to false (show homepage)
    console.error("Error fetching homepage setting:", error);
    return false;
  }
}

/**
 * Middleware for handling authentication and authorization
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect /login to /auth/signin to prevent redirect loops
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Special handling for the setup page to prevent loops with auth
  if (pathname === "/setup") {
    // Check if the route is public (which it is)
    const response = NextResponse.next();
    // Add a header to track that this was a redirect from setup
    response.headers.set("x-redirect-from", "/setup");
    return response;
  }

  // Special handling to prevent redirect loops between /auth/signin and /setup
  if (pathname === "/auth/signin") {
    // Check for redirects from setup in the referer header
    const referer = request.headers.get("referer") || "";
    if (referer.includes("/setup")) {
      // This is a potential redirect loop - just show the signin page
      return NextResponse.next();
    }
  }

  // Special handling for the root path based on the disableHomepage setting
  if (pathname === "/") {
    // For API routes and API calls to the root path, just continue
    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.next();
    }

    // Get the homepage setting directly from the API
    const disableHomepage = await getHomepageSetting(request);

    // If the homepage is disabled, check authentication and redirect accordingly
    if (disableHomepage) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      // Redirect authenticated users to /calendar, unauthenticated to /auth/signin
      if (token) {
        return NextResponse.redirect(new URL("/calendar", request.url));
      } else {
        return NextResponse.redirect(new URL("/auth/signin", request.url));
      }
    }

    // If homepage is not disabled, continue normally
    return NextResponse.next();
  }

  // Check if the route is public
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if the route is an API route (we'll handle auth in the API routes themselves)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Get the token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If there's no token, redirect to the sign-in page
  if (!token) {
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // Check if the route is admin-only
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    // If the user is not an admin, redirect to the home page
    if (token.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Continue with the request
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
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
