import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/styleguide"];

/**
 * Refreshes the Supabase session cookie on every request and does an
 * optimistic redirect to /login. Real authorization lives in lib/auth/dal.ts.
 */
export async function proxy(request: NextRequest) {
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!isSupabaseConfigured) {
    return isPublic ? NextResponse.next() : redirectTo(request, "/login");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Must run before any other logic so refreshed tokens reach the response.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isPublic) {
    const next = request.nextUrl.pathname + request.nextUrl.search;
    return redirectTo(request, "/login", next === "/" ? undefined : { next });
  }
  if (signedIn && request.nextUrl.pathname.startsWith("/login")) {
    // La DAL ha rechazado esta sesión: se borran sus cookies y se muestra el acceso.
    if (request.nextUrl.searchParams.get("sesion") === "caducada") {
      const clean = NextResponse.next({ request });
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith("sb-")) clean.cookies.delete(cookie.name);
      }
      return clean;
    }
    return redirectTo(request, "/");
  }

  return response;
}

function redirectTo(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = params ? new URLSearchParams(params).toString() : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)"],
};
