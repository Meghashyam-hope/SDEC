import type { NextConfig } from "next";

/**
 * Derives the Supabase project's own origin from its public URL so CSP
 * only allowlists that one project, not every *.supabase.co tenant.
 * Falls back to the wildcard if the env var is missing at build time
 * (e.g. a CI lint/typecheck run with no .env.local).
 */
function supabaseOrigin(): { https: string; wss: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { https: "https://*.supabase.co", wss: "wss://*.supabase.co" };
  try {
    const host = new URL(url).host;
    return { https: `https://${host}`, wss: `wss://${host}` };
  } catch {
    return { https: "https://*.supabase.co", wss: "wss://*.supabase.co" };
  }
}

const { https: supabaseHttps, wss: supabaseWss } = supabaseOrigin();

/**
 * `'unsafe-inline'` on script-src is a deliberate, documented trade-off:
 * Next's App Router streams RSC payloads via small inline <script> tags
 * in the initial HTML, which a strict `script-src 'self'` would block
 * outright. A per-request nonce is the stricter alternative but needs
 * threading through proxy.ts + the root layout — not done here. Every
 * other directive is left as tight as the app actually needs.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseHttps}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseHttps} ${supabaseWss}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
