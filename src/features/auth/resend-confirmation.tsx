import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { ConfirmationLinkForm } from "./confirmation-link-form"

/** Linked from sign-in: a new account confirms its email before it can sign in. */
export function ResendConfirmation({ localInboxUrl }: { localInboxUrl: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg font-semibold">Get a new confirmation link</h1>
        </CardTitle>
        <CardDescription>
          Enter the email address you registered with. If it&apos;s waiting to be confirmed, we&apos;ll email a new link, and
          older links stop working.
        </CardDescription>
      </CardHeader>
      <ConfirmationLinkForm localInboxUrl={localInboxUrl} />
    </Card>
  )
}
