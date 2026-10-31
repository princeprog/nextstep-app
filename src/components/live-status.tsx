import { CircleCheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A polite live region for the result of an action, such as "We sent a new link". It stays in the accessibility tree
 * while empty (visually hidden and out of the layout), so screen readers announce the message when it appears.
 */
export function LiveStatus({ message, className }: { message: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={message ? cn("flex items-start gap-2 text-sm", className) : "sr-only"}>
      {message ? (
        <>
          <CircleCheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{message}</span>
        </>
      ) : null}
    </div>
  )
}
