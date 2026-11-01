import { connection } from "next/server"

/**
 * LOCAL_INBOX_URL is the web inbox that receives the app's emails on a local run, such as Mailpit at
 * http://127.0.0.1:8025. Local runs never deliver email to real inboxes (the API writes emails to its log or sends them
 * to Mailpit), so when it's set, every screen that says an email was sent also says where it went.
 *
 * It's a server-side setting read on every request and passed to the screens as a prop. It's deliberately not a
 * NEXT_PUBLIC_ variable, which next build would copy into the JavaScript it ships, so no build can carry it into
 * production. Leave it unset in production and staging.
 */

/** The inbox address, or null when the value is unset or isn't an http(s) address. Addresses with credentials are refused. */
export function parseLocalInboxUrl(value: string | undefined): string | null {
  const text = value?.trim()
  if (!text) {
    return null
  }
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  // A user name or password would end up in the page's HTML for anyone to read.
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    return null
  }
  return url.href
}

/** LOCAL_INBOX_URL for the request being rendered. For server components only. */
export async function readLocalInboxUrl(): Promise<string | null> {
  // Waiting for the request means the value is read when a page is served, never when the app is built.
  await connection()
  return parseLocalInboxUrl(process.env.LOCAL_INBOX_URL)
}
