"use client"

import { ArchiveIcon, ArchiveRestoreIcon, ArrowLeftIcon, ExternalLinkIcon, PencilIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { ButtonLink } from "@/components/button-link"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { ErrorState } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { InterviewList } from "@/features/interviews/interview-list"
import { TaskList } from "@/features/tasks/task-list"
import {
  useApplication,
  useApplicationInterviews,
  useApplicationTasks,
  useArchiveApplication,
  useRestoreApplication,
} from "@/features/workspace/api"
import { errorMessage, isApiError } from "@/lib/api/errors"
import type { Application } from "@/lib/api/types"
import { formatSalary, formatUpdated } from "@/lib/format"
import { ARRANGEMENT_LABELS, EMPLOYMENT_LABELS } from "@/lib/labels"
import { formatDate } from "@/lib/time"
import { useUiStore } from "@/stores/ui-store"

import { StatusControl } from "./status-control"

export function BackToApplications() {
  const query = useUiStore((state) => state.applicationsQuery)
  return (
    <Link href={"/applications" + (query ? "?" + query : "")}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      Back to applications
    </Link>
  )
}

export function ApplicationDetail({ id }: { id: string }) {
  const application = useApplication(id)

  if (application.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading application">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (application.isError) {
    if (isApiError(application.error) && application.error.status === 404) {
      return (
        <>
          <BackToApplications />
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle><h1>Application not found</h1></EmptyTitle>
              <EmptyDescription>It may have been removed, or the link may belong to another account.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </>
      )
    }
    return <ErrorState title="We couldn't load this application" error={application.error} onRetry={() => application.refetch()} />
  }
  return <Loaded application={application.data} />
}

function Loaded({ application }: { application: Application }) {
  const archive = useArchiveApplication()
  const restore = useRestoreApplication()
  const openTaskDialog = useUiStore((state) => state.openTaskDialog)
  const openInterviewDialog = useUiStore((state) => state.openInterviewDialog)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const salary = formatSalary(application)

  async function onRestore() {
    try {
      await restore.mutateAsync(application.id)
      toast.success(application.company + " restored")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <>
      <BackToApplications />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{application.company}</h1>
          <p className="text-muted-foreground break-words">{application.jobTitle}</p>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={application.status} />
            <span className="text-xs text-muted-foreground">Updated {formatUpdated(application.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {application.archived ? (
            <Button onClick={onRestore} disabled={restore.isPending}>
              <ArchiveRestoreIcon data-icon="inline-start" />
              Restore
            </Button>
          ) : (
            <>
              <StatusControl application={application} id="status-detail" />
              <ButtonLink variant="outline" href={"/applications/" + application.id + "/edit"}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </ButtonLink>
              <Button variant="outline" onClick={() => setConfirmArchive(true)}>
                <ArchiveIcon data-icon="inline-start" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      {application.archived ? (
        <Alert>
          <ArchiveIcon />
          <AlertTitle>This application is archived</AlertTitle>
          <AlertDescription>
            It&apos;s hidden from your dashboard and lists, and its tasks and interviews are read-only. Restore it to make changes.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle><h2>Overview</h2></CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Detail label="Job posting">
                {application.jobUrl ? (
                  <a href={application.jobUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all text-primary underline-offset-4 hover:underline">
                    Open posting
                    <ExternalLinkIcon aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : null}
              </Detail>
              <Detail label="Applied">{application.appliedDate ? formatDate(application.appliedDate) : null}</Detail>
              <Detail label="Location">{application.location}</Detail>
              <Detail label="Arrangement">{application.workArrangement ? ARRANGEMENT_LABELS[application.workArrangement] : null}</Detail>
              <Detail label="Employment type">{application.employmentType ? EMPLOYMENT_LABELS[application.employmentType] : null}</Detail>
              <Detail label="Salary">{salary}</Detail>
              <Detail label="Contact">
                {application.contactName || application.contactEmail ? (
                  <span className="flex flex-col">
                    {application.contactName ? <span>{application.contactName}</span> : null}
                    {application.contactEmail ? (
                      <a href={"mailto:" + application.contactEmail} className="break-all text-primary underline-offset-4 hover:underline">
                        {application.contactEmail}
                      </a>
                    ) : null}
                  </span>
                ) : null}
              </Detail>
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle><h2>Notes</h2></CardTitle>
            </CardHeader>
            <CardContent>
              {application.notes ? (
                <p className="text-sm break-words whitespace-pre-wrap">{application.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
            </CardContent>
          </Card>
          <TasksCard application={application} onAdd={() => openTaskDialog({ applicationId: application.id })} />
          <InterviewsCard application={application} onAdd={() => openInterviewDialog({ applicationId: application.id })} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={"Archive " + application.company + "?"}
        description="It will be hidden from your dashboard and lists. Its notes, tasks, and interviews are kept, and you can restore it anytime."
        confirmLabel="Archive"
        onConfirm={async () => {
          try {
            await archive.mutateAsync(application.id)
            toast.success(application.company + " archived")
          } catch (error) {
            toast.error(errorMessage(error))
            throw error
          }
        }}
      />
    </>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

function TasksCard({ application, onAdd }: { application: Application; onAdd: () => void }) {
  const tasks = useApplicationTasks(application.id, 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>Tasks</h2></CardTitle>
        {application.archived ? null : (
          <CardAction>
            <Button size="sm" variant="outline" onClick={onAdd}>
              <PlusIcon data-icon="inline-start" />
              Add task
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {tasks.isPending ? (
          <Skeleton className="h-16" />
        ) : tasks.isError ? (
          <ErrorState title="Tasks are unavailable" error={tasks.error} onRetry={() => tasks.refetch()} />
        ) : tasks.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks yet. Add a follow-up so it shows up on your dashboard.</p>
        ) : (
          <TaskList tasks={tasks.data.items} showApplication={false} />
        )}
      </CardContent>
    </Card>
  )
}

function InterviewsCard({ application, onAdd }: { application: Application; onAdd: () => void }) {
  const interviews = useApplicationInterviews(application.id, 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>Interviews</h2></CardTitle>
        {application.archived ? null : (
          <CardAction>
            <Button size="sm" variant="outline" onClick={onAdd}>
              <PlusIcon data-icon="inline-start" />
              Add interview
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {interviews.isPending ? (
          <Skeleton className="h-16" />
        ) : interviews.isError ? (
          <ErrorState title="Interviews are unavailable" error={interviews.error} onRetry={() => interviews.refetch()} />
        ) : interviews.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interviews recorded.</p>
        ) : (
          <InterviewList interviews={interviews.data.items} showApplication={false} />
        )}
      </CardContent>
    </Card>
  )
}

