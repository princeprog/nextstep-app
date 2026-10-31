import { expect } from "@playwright/test"

/**
 * Reads the emails the API sent, from Mailpit's HTTP API. The API must send through Mailpit's SMTP port: locally
 * ..\nextstep-api\scripts\run-api.ps1 -Mailpit, and in CI the e2e job starts both.
 */
const MAILPIT_URL = (process.env.MAILPIT_URL ?? "http://127.0.0.1:8025").replace(/\/+$/, "")

export const SUBJECTS = {
  verify: "Confirm your email for NextStep",
  accountExists: "You already have a NextStep account",
  reset: "Reset your NextStep password",
  passwordChanged: "Your NextStep password was changed",
  deleted: "Your NextStep account was deleted",
} as const

type Summary = { ID: string; Subject: string; Created: string }
export type Email = Summary & { Text: string }

async function mailpit<T>(path: string): Promise<T> {
  const response = await fetch(MAILPIT_URL + path)
  if (!response.ok) {
    throw new Error("Mailpit answered " + response.status + " for " + path + ". Is it running at " + MAILPIT_URL + "?")
  }
  return (await response.json()) as T
}

/** Every email sent to the address, newest first. */
export async function emailsTo(address: string): Promise<Summary[]> {
  const query = encodeURIComponent('to:"' + address + '"')
  const { messages } = await mailpit<{ messages: Summary[] }>("/api/v1/search?query=" + query)
  return [...messages].sort((a, b) => Date.parse(b.Created) - Date.parse(a.Created))
}

/**
 * Waits until the address has received at least `count` emails with this subject (the API sends them right after
 * the request, from a queue), and returns them newest first with their text.
 */
export async function waitForEmails(address: string, subject: string, count = 1): Promise<Email[]> {
  let found: Summary[] = []
  await expect
    .poll(async () => {
      found = (await emailsTo(address)).filter((message) => message.Subject === subject)
      return found.length
    }, { message: '"' + subject + '" emails to ' + address, timeout: 30_000 })
    .toBeGreaterThanOrEqual(count)
  return Promise.all(found.map((message) => mailpit<Email>("/api/v1/message/" + encodeURIComponent(message.ID))))
}

export async function latestEmail(address: string, subject: string): Promise<Email> {
  const [email] = await waitForEmails(address, subject)
  return email
}

/**
 * The path and fragment of the app link in an email, such as /verify-email#token=…, to open against the base URL
 * under test whatever origin the API puts in its links.
 */
export function linkIn(email: Email, path: "/verify-email" | "/reset-password"): string {
  const link = email.Text.match(new RegExp("https?://\\S+?" + path + "#token=[A-Za-z0-9_-]+"))?.[0]
  if (!link) {
    throw new Error("No " + path + " link in the email \"" + email.Subject + "\"")
  }
  const url = new URL(link)
  return url.pathname + url.hash
}
