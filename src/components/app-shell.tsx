"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  BriefcaseIcon,
  CalendarClockIcon,
  FlaskConicalIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Wordmark } from "@/components/brand"
import { ErrorState } from "@/components/error-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useClearPrivateState, useMe, useSignOut } from "@/features/auth/api"
import { InterviewDialog } from "@/features/interviews/interview-dialog"
import { TaskDialog } from "@/features/tasks/task-dialog"
import { onSessionEnded } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { keys } from "@/lib/api/keys"
import type { Me } from "@/lib/api/types"
import { formatInstant } from "@/lib/time"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/applications", label: "Applications", icon: BriefcaseIcon },
  { href: "/tasks", label: "Tasks", icon: ListChecksIcon },
  { href: "/interviews", label: "Interviews", icon: CalendarClockIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [endedTarget, setEndedTarget] = useState<string | null>(null)
  const ending = useRef(false)
  const me = useMe({ enabled: endedTarget === null })
  const clear = useClearPrivateState()

  // When the API says the session ended, stop rendering private views, drop every cached record, and go to sign-in.
  // The handler runs once; later 401s from requests already in flight are ignored.
  useEffect(() => {
    onSessionEnded((error) => {
      if (ending.current) {
        return
      }
      ending.current = true
      const hadSession = Boolean(queryClient.getQueryData(keys.me))
      setEndedTarget(
        !hadSession ? "/login" : error.code === "DEMO_EXPIRED" ? "/login?reason=demo-expired" : "/login?reason=expired",
      )
    })
    return () => onSessionEnded(null)
  }, [queryClient])

  useEffect(() => {
    if (endedTarget) {
      clear()
      router.replace(endedTarget)
    }
  }, [endedTarget, clear, router])

  const signedOut = isApiError(me.error) && me.error.isSessionEnded
  useEffect(() => {
    if (signedOut && !endedTarget) {
      router.replace("/login")
    }
  }, [signedOut, endedTarget, router])

  if (endedTarget || me.isPending || signedOut) {
    return (
      <div className="flex min-h-svh" aria-busy="true">
        <span className="sr-only" role="status">Loading your workspace</span>
        <div className="hidden w-64 flex-col gap-3 border-r bg-sidebar p-4 md:flex">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  if (me.isError) {
    return (
      <main className="mx-auto max-w-md p-6">
        <ErrorState title="We couldn't load your workspace" error={me.error} onRetry={() => me.refetch()} />
      </main>
    )
  }

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <AppSidebar me={me.data} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80">
          <SidebarTrigger aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-medium md:hidden">
            <Wordmark />
          </span>
        </header>
        {me.data.kind === "DEMO" ? <DemoBanner me={me.data} /> : null}
        <div id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 outline-none md:p-6">
          {children}
        </div>
      </SidebarInset>
      <TaskDialog />
      <InterviewDialog />
    </SidebarProvider>
  )
}

function AppSidebar({ me }: { me: Me }) {
  const pathname = usePathname()
  const router = useRouter()
  const signOut = useSignOut()
  const { setOpenMobile } = useSidebar()

  async function onSignOut() {
    await signOut.mutateAsync()
    router.replace("/login?reason=signed-out")
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <Link href="/dashboard" className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Wordmark />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Main">
              <SidebarMenu>
                {NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        render={<Link href={item.href} aria-current={active ? "page" : undefined} />}
                        onClick={() => setOpenMobile(false)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">{me.displayName}</span>
          {me.kind === "DEMO" ? (
            <Badge variant="secondary">Demo workspace</Badge>
          ) : (
            <span className="truncate text-xs text-muted-foreground">{me.email}</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onSignOut} disabled={signOut.isPending}>
          <LogOutIcon data-icon="inline-start" />
          {me.kind === "DEMO" ? "Leave demo" : "Sign out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

function DemoBanner({ me }: { me: Me }) {
  return (
    <div role="note" className="flex items-start gap-2 border-b bg-secondary px-4 py-2 text-sm text-secondary-foreground md:px-6">
      <FlaskConicalIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        You&apos;re exploring a temporary demo with fictional data. Changes stay in this demo only, and it is removed{" "}
        {me.demoExpiresAt ? "on " + formatInstant(me.demoExpiresAt, me.timeZone) : "after 24 hours"}.
      </p>
    </div>
  )
}

