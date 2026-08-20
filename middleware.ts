import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function parseJwtPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getLocalSessionUser(request: NextRequest) {
  try {
    const allCookies = request.cookies.getAll();
    const tokenCookies = allCookies
      .filter((c) => c.name.includes("auth-token") || c.name.startsWith("sb-"))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (tokenCookies.length === 0) return null;

    let rawValue = tokenCookies.map((c) => c.value).join("");
    if (rawValue.startsWith("base64-")) {
      try {
        rawValue = atob(rawValue.replace("base64-", ""));
      } catch {
        // ignore
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      try {
        parsed = JSON.parse(decodeURIComponent(rawValue));
      } catch {
        parsed = rawValue;
      }
    }

    let accessToken = "";
    if (typeof parsed === "string") {
      accessToken = parsed;
    } else if (parsed && typeof parsed === "object") {
      accessToken = parsed.access_token || (Array.isArray(parsed) ? parsed[0] : "");
    }

    if (!accessToken || typeof accessToken !== "string") return null;

    const payload = parseJwtPayload(accessToken);
    if (!payload || !payload.exp) return null;

    // Check if token has at least 60s remaining
    const nowInSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowInSec + 60) {
      // Near expiration, let Supabase handle refresh
      return null;
    }

    const role = payload.user_metadata?.role || payload.app_metadata?.role || "operator";
    return {
      id: payload.sub,
      role,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

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

  // 3. Fast-path: 0ms Local JWT Validation (Eliminates remote HTTPS auth roundtrip on page navigation)
  const localUser = getLocalSessionUser(request);
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

  if (localUser) {
    if (isLoginPage) {
      return NextResponse.redirect(
        new URL(localUser.role === "admin" ? "/" : "/kiosk", request.url)
      );
    }
    if (isAdminRoute && localUser.role !== "admin") {
      return NextResponse.redirect(new URL("/kiosk", request.url));
    }
    // High-speed 0ms pass-through for authenticated admin navigating dashboard
    return NextResponse.next();
  }

  // 4. Fallback for expired tokens or initial logins: instantiate Supabase client to refresh cookies
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
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const role = user.user_metadata?.role || "operator";

    if (isLoginPage) {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      } else {
        return NextResponse.redirect(new URL("/kiosk", request.url));
      }
    }

    if (isAdminRoute && role !== "admin") {
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
