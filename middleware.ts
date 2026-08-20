import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // 1. Instant bypass for public pages, kiosk, stampbook, static assets, and favicon
  const isAuthEntryPage =
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/signup") ||
    url.pathname.startsWith("/reset-password");

  const isPublicPage =
    url.pathname.startsWith("/stampbook") ||
    url.pathname.startsWith("/kiosk") ||
    url.pathname.startsWith("/_next") ||
    url.pathname === "/favicon.ico" ||
    url.pathname.startsWith("/api/public");

  if (isPublicPage) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminRoutes = [
    "/events",
    "/booths",
    "/students",
    "/statistics",
    "/logs",
    "/settings",
  ];
  const isAdminRoute =
    adminRoutes.some((route) => url.pathname.startsWith(route)) ||
    url.pathname === "/";

  if (!user && !isAuthEntryPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    const res = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value));
    return res;
  }

  if (user) {
    const role = user.user_metadata?.role || "operator";

    if (isAuthEntryPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = role === "admin" ? "/" : "/kiosk";
      const res = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value));
      return res;
    }

    if (isAdminRoute && role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/kiosk";
      const res = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value));
      return res;
    }
  }

  return supabaseResponse;
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
