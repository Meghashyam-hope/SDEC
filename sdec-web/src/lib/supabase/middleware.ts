import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const STUDENT_PREFIX = "/dashboard";
const OTHER_STUDENT_PREFIXES = ["/vote", "/nominate", "/profile"];
const ADMIN_PREFIX = "/admin";
const ADMIN_PUBLIC_PATHS = new Set(["/admin/login"]);

/**
 * Refreshes the Supabase session cookie on every request and guards the
 * (student) and admin/ route groups by role. Called from proxy.ts (the
 * Next.js 16 rename of middleware.ts — see AGENTS.md / node_modules/next).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsStudent =
    pathname.startsWith(STUDENT_PREFIX) ||
    OTHER_STUDENT_PREFIXES.some((p) => pathname.startsWith(p));
  const needsAdmin =
    pathname.startsWith(ADMIN_PREFIX) && !ADMIN_PUBLIC_PATHS.has(pathname);

  if ((needsStudent || needsAdmin) && !user) {
    const loginPath = needsAdmin ? "/admin/login" : "/login";
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (needsAdmin && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role === "student") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
