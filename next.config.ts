import type { NextConfig } from "next"

// The browser talks to the API on the same origin (/api/v1). In development and for a single-host deployment,
// Next.js forwards those requests to Spring Boot. API_ORIGIN is server-side only and never sent to the browser.
// next build records the rewrite (and the headers below) in its output and next start uses that record, so set
// API_ORIGIN before building; next dev reads it when it starts.
const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:8080"

// Browser features the app never uses. Each one is denied for this page and anything it embeds.
const permissionsPolicy = ["accelerometer", "camera", "geolocation", "gyroscope", "magnetometer", "microphone", "payment", "usb"]
  .map((feature) => feature + "=()")
  .join(", ")

const nextConfig: NextConfig = {
  // scripts/staging.ps1 builds into .next-staging, so a staging build never replaces the one pnpm test:e2e uses.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The container image (Dockerfile) builds the self-contained standalone server; other builds keep next start.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }]
  },
  async headers() {
    // The per-request Content-Security-Policy, and Strict-Transport-Security when APP_HTTPS=true, come from
    // src/proxy.ts because they change per response or per deployment.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: permissionsPolicy },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ]
  },
}

export default nextConfig

