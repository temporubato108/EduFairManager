import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // 1. Instant 0ms bypass for public pages, kiosk, stampbook, static assets, and favicon
  const isLoginPage = url.pathname.startsWith("/login");
  const isPublicPage =
    url.pathname.startsWith("/stampbook") ||
    url.pathname.startsWith("/kiosk") ||
    url.pathname.startsWith("/_next") ||
    url.pathname === "/favicon.ico" ||
    url.pathname.startsWith("/api/public");

  if (isPublicPage) {
    return NextResponse.next();
  }

  // 2. Quick cookie check: If unauthenticated visitor has no auth cookies and is not on /login, redirect immediately
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.includes("auth-token") || c.name.startsWith("sb-")
  );

  if (!hasAuthCookie && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. For pages needing authentication verification, instantiate Supabase client
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLoginPage) {
    // Redirect to login if not logged in
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    // Retrieve role from user metadata (fallback to operator)
    const role = user.user_metadata?.role || "operator";

    if (isLoginPage) {
      // Redirect logged-in users away from the login page
      if (role === "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      } else {
        return NextResponse.redirect(new URL("/kiosk", request.url));
      }
    }

    // Guard Admin Routes
    const adminRoutes = [
      "/events",
      "/booths",
      "/students",
      "/statistics",
      "/logs",
      "/settings"
    ];
    
    // Check if the current route is an admin route or the dashboard root
    const isAdminRoute = adminRoutes.some((route) => url.pathname.startsWith(route)) || url.pathname === "/";

    if (isAdminRoute && role !== "admin") {
      // Redirect operators trying to access admin pages to Kiosk
      return NextResponse.redirect(new URL("/kiosk", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml
     * - images, fonts, media, and document files (.svg, .png, .jpg, .woff, .woff2, .pdf, .xlsx, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|pdf|xlsx|csv|txt)$).*)",
  ],
};
