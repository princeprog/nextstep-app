/**
 * Security headers that depend on the request or on how the app is deployed. src/proxy.ts sends them with every
 * page; the static headers (noindex, referrer, nosniff, framing, permissions, opener policy) are in next.config.ts.
 */

/** One year, including subdomains. Only sent when the app is served over HTTPS (APP_HTTPS=true). */
export const STRICT_TRANSPORT_SECURITY = "max-age=31536000; includeSubDomains"

/**
 * Server-only flag, read on every request: set APP_HTTPS=true when browsers reach the app over HTTPS (for example
 * behind a TLS-terminating proxy). It adds Strict-Transport-Security and upgrade-insecure-requests.
 */
export function servedOverHttps(env: Partial<Record<string, string>> = process.env): boolean {
  return env.APP_HTTPS === "true"
}

export type PolicyOptions = {
  /** A fresh, unguessable value per response. Next.js adds it to the scripts it renders. */
  nonce: string
  /** next dev needs eval for React's development tooling. */
  development: boolean
  https: boolean
}

export function contentSecurityPolicy({ nonce, development, https }: PolicyOptions): string {
  const directives: string[][] = [
    ["default-src", "'self'"],
    // Only scripts carrying this response's nonce run; 'strict-dynamic' lets them load the app's chunks.
    // 'self' is a fallback for browsers without CSP Level 3.
    ["script-src", "'self'", "'nonce-" + nonce + "'", "'strict-dynamic'", ...(development ? ["'unsafe-eval'"] : [])],
    // Inline styles can't run script. They stay allowed because Sonner inserts its stylesheet at runtime and
    // server-rendered components (the sidebar) set CSS variables in style attributes.
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:"],
    ["font-src", "'self'"],
    // The browser only talks to this origin; /api/v1 is forwarded to the API by next.config.ts.
    ["connect-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ]
  if (https) {
    directives.push(["upgrade-insecure-requests"])
  }
  return directives.map((directive) => directive.join(" ")).join("; ")
}
