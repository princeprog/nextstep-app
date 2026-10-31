"use client"

import { FlaskConicalIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ButtonLink } from "@/components/button-link"

import { ErrorState } from "@/components/error-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { browserTimeZone } from "@/lib/time"

import { useClearPrivateState, useMe, useSignOut, useStartDemo } from "./api"

export function DemoStart() {
  const router = useRouter()
  const me = useMe()
  const startDemo = useStartDemo()
  const signOut = useSignOut()
  const clear = useClearPrivateState()

  async function start() {
    try {
      await startDemo.mutateAsync({ timeZone: browserTimeZone() })
      router.replace("/dashboard")
    } catch {
      // The error is shown below with a retry button.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <FlaskConicalIcon aria-hidden="true" className="size-5 text-primary" />
            Try the demo
          </h1>
        </CardTitle>
        <CardDescription>Explore NextStep without creating an account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
          <li>You get your own workspace filled with fictional companies, contacts, tasks, and interviews.</li>
          <li>Anything you change stays in your demo; other visitors can&apos;t see it.</li>
          <li>The demo and its data are removed 24 hours after you start it.</li>
          <li>No emails, reminders, or outside services are involved.</li>
        </ul>
        {me.data ? (
          <p role="status">
            You&apos;re signed in as {me.data.displayName}. Sign out first to start a separate demo.
          </p>
        ) : null}
        {startDemo.isError ? <ErrorState title="We couldn't start a demo" error={startDemo.error} onRetry={start} /> : null}
      </CardContent>
      <CardFooter className="mt-4 flex flex-col items-stretch gap-3">
        {me.data ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" disabled={signOut.isPending} onClick={() => signOut.mutate(undefined, { onSettled: clear })}>
              Sign out
            </Button>
            <ButtonLink href="/dashboard">
              Back to my workspace
            </ButtonLink>
          </div>
        ) : (
          <Button size="lg" onClick={start} disabled={startDemo.isPending}>
            {startDemo.isPending ? <Spinner data-icon="inline-start" /> : null}
            Start demo
          </Button>
        )}
        <p className="text-center text-sm text-muted-foreground">
          Prefer your own workspace?{" "}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/register">
            Create an account
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

