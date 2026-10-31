import { NextResponse, type NextRequest } from "next/server"

import { contentSecurityPolicy, servedOverHttps, STRICT_TRANSPORT_SECURITY } from "@/lib/security-headers"

/**
 * Gives every page response a Content-Security-Policy with a fresh nonce. Next.js reads the nonce from the request's
 * CSP header and adds it to the scripts it renders, which is why the root layout renders pages per request.
 */
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const https = servedOverHttps()
  const policy = contentSecurityPolicy({ nonce, development: process.env.NODE_ENV === "development", https })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("Content-Security-Policy", policy)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", policy)
  if (https) {
    response.headers.set("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY)
  }
  return response
}

export const config = {
  matcher: [
    {
      // Pages only. API calls (forwarded to Spring Boot), build assets, and metadata files don't render HTML, and
      // router prefetches are data requests.
      source: "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
