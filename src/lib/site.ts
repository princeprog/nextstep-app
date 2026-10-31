/**
 * Links to the separate public website, such as the Terms of use and the Privacy policy.
 *
 * NEXT_PUBLIC_SITE_URL is public and fixed at build time: next build copies its value into the JavaScript sent to
 * browsers, so set it before pnpm build and rebuild after changing it. It must be an absolute http:// or https://
 * address; a path is allowed for a site served from a folder. Unset or empty means the local static site.
 */
export const DEFAULT_SITE_URL = "http://localhost:3001"

/** The site's address without a trailing slash. Throws when the value isn't an http(s) address. */
export function parseSiteUrl(value: string | undefined): string {
  const text = value?.trim()
  if (!text) {
    return DEFAULT_SITE_URL
  }
  let url: URL | null = null
  try {
    url = new URL(text)
  } catch {
    url = null
  }
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.search || url.hash) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an http:// or https:// address such as https://nextstep.example, without a query or fragment.",
    )
  }
  return url.origin + url.pathname.replace(/\/+$/, "")
}

// Written out in full so next build can replace it with the configured value.
export const SITE_URL = parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)

export const TERMS_URL = SITE_URL + "/terms/"
export const PRIVACY_URL = SITE_URL + "/privacy/"
