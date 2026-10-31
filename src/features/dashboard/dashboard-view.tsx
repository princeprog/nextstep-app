"use client"

import { ArrowRightIcon, BriefcaseIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { ButtonLink } from "@/components/button-link"

import { ErrorState } from "@/components/error-state"
import { LoadingRegion } from "@/components/loading-region"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useMe } from "@/features/auth/api"
import { InterviewList } from "@/features/interviews/interview-list"
import { TaskList } from "@/features/tasks/task-list"
import { useDashboard } from "@/features/workspace/api"
import type { Dashboard } from "@/lib/api/types"
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels"
import { useUiStore } from "@/stores/ui-store"

export function DashboardView() {
  const me = useMe()
  const dashboard = useDashboard()
  const openTaskDialog = useUiStore((state) => state.openTaskDialog)

  return (
    <>
      <PageHeader
        title="What needs attention"
        description={me.data ? "Welcome back, " + me.data.displayName + "." : undefined}
        actions={
          <>
            <ButtonLink href="/applications/new">
              <PlusIcon data-icon="inline-start" />
              Add application
            </ButtonLink>
            <Button variant="outline" onClick={() => openTaskDialog()}>
              <PlusIcon data-icon="inline-start" />
              Add task
            </Button>
            <ButtonLink variant="ghost" href="/applications">
              All applications
            </ButtonLink>
          </>
        }
      />
      {dashboard.isPending ? (
        <LoadingRegion label="Loading dashboard" className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </LoadingRegion>
      ) : dashboard.isError ? (
        <ErrorState title="Your dashboard is unavailable right now" error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : (
        <DashboardContent data={dashboard.data} />
      )}
    </>
  )
}

function DashboardContent({ data }: { data: Dashboard }) {
  const totalApplications = STATUS_ORDER.reduce((sum, status) => sum + data.statusCounts[status], 0)
  const nothingYet =
    totalApplications === 0 && data.overdueTasks.total === 0 && data.upcomingTasks.total === 0 && data.upcomingInterviews.total === 0

  if (nothingYet) {
    return (
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BriefcaseIcon />
          </EmptyMedia>
          <EmptyTitle><h2>Start with your first application</h2></EmptyTitle>
          <EmptyDescription>
            Save a role you&apos;re interested in. Follow-ups and interviews you add will appear here when they need attention.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink href="/applications/new">
            <PlusIcon data-icon="inline-start" />
            Add application
          </ButtonLink>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section
        title="Overdue tasks"
        description="Open tasks past their due date or time."
        total={data.overdueTasks.total}
        shown={data.overdueTasks.items.length}
        href="/tasks?view=overdue"
        empty="Nothing overdue. Nice work."
      >
        <TaskList tasks={data.overdueTasks.items} />
      </Section>
      <Section
        title="Upcoming tasks"
        description="Due today through the next six days."
        total={data.upcomingTasks.total}
        shown={data.upcomingTasks.items.length}
        href="/tasks?view=upcoming"
        empty="No tasks due this week."
      >
        <TaskList tasks={data.upcomingTasks.items} />
      </Section>
      <Section
        title="Upcoming interviews"
        description="Starting in the next 7 days."
        total={data.upcomingInterviews.total}
        shown={data.upcomingInterviews.items.length}
        href="/interviews?view=next7days"
        empty="No interviews in the next 7 days."
      >
        <InterviewList interviews={data.upcomingInterviews.items} />
      </Section>
      <Card>
        <CardHeader>
          <CardTitle><h2>Pipeline</h2></CardTitle>
          <CardDescription>{totalApplications} active {totalApplications === 1 ? "application" : "applications"}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STATUS_ORDER.map((status) => (
              <li key={status}>
                <Link
                  href={"/applications?status=" + status}
                  className="flex flex-col gap-1 rounded-lg border p-3 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="text-2xl font-semibold tabular-nums">{data.statusCounts[status]}</span>
                  <span className="text-sm text-muted-foreground">{STATUS_LABELS[status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function Section({
  title,
  description,
  total,
  shown,
  href,
  empty,
  children,
}: {
  title: string
  description: string
  total: number
  shown: number
  href: string
  empty: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            {title}
            <Badge variant={total > 0 ? "secondary" : "outline"} aria-label={total + " total"}>{total}</Badge>
          </h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {total > 0 ? (
          <CardAction>
            <ButtonLink variant="ghost" size="sm" href={href}>
              View all
              <ArrowRightIcon data-icon="inline-end" />
            </ButtonLink>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {total === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
        {total > shown ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Showing {shown} of {total}.{" "}
            <Link href={href} className="text-primary underline-offset-4 hover:underline">See all {total}</Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

