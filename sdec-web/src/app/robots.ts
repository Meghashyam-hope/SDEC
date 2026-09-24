import type { MetadataRoute } from "next";

/** Public pages (landing, published election pages, results, verify) are
 * fine to index. Everything that needs a session or is per-student stays
 * out of search results. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/vote", "/nominate", "/login", "/signup"],
    },
  };
}
