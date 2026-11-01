import { ExternalLinkIcon, FlaskConicalIcon } from "lucide-react"

/**
 * Tells a local tester where the email went. Screens that say an email was sent show it when LOCAL_INBOX_URL is set
 * (src/lib/local-inbox.ts); without it, nothing renders. It stays outside status messages, so what they announce is
 * the same as in production.
 */
export function LocalInboxNote({ url }: { url: string | null }) {
  if (!url) {
    return null
  }
  return (
    <div role="note" className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
      <FlaskConicalIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        This is a local run, so emails go to the local test inbox instead of the real inbox.{" "}
        <a className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4" href={url}
          target="_blank" rel="noreferrer">
          Open the test inbox{" "}
          <ExternalLinkIcon aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </p>
    </div>
  )
}
