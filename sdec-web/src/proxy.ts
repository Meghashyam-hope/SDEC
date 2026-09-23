import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (nodejs runtime only —
 * see node_modules/next/dist/docs .../upgrading/version-16.md). This is the
 * root file the framework loads; the actual logic lives in
 * lib/supabase/middleware.ts so it can be unit-tested.
 */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
