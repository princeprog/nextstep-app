"use client"

import { PlusIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { ErrorState } from "@/components/error-state"
import { LoadingRegion } from "@/components/loading-region"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
import { ViewTabs } from "@/components/view-tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { type TaskView, useTasks } from "@/features/workspace/api"
import { parsePage } from "@/lib/pagination"
import { useUiStore } from "@/stores/ui-store"

import { TaskList } from "./task-list"

const VIEWS: { value: TaskView; label: string; empty: string }[] = [
  { value: "open", label: "Open", empty: "No open tasks." },
  { value: "overdue", label: "Overdue", empty: "Nothing overdue." },
  { value: "upcoming", label: "Next 7 days", empty: "No tasks due today or in the next six days." },
  { value: "completed", label: "Completed", empty: "No completed tasks yet." },
  { value: "all", label: "All", empty: "No tasks yet. Add one from an application or with the button above." },
]

export function TasksView() {
  const router = useRouter()
  const search = useSearchParams()
  const view = (VIEWS.find((item) => item.value === search.get("view"))?.value ?? "open") as TaskView
  const page = parsePage(search.get("page"))
  const tasks = useTasks(view, page)
  const openTaskDialog = useUiStore((state) => state.openTaskDialog)

  useEffect(() => {
    if (tasks.data && !tasks.isPlaceholderData && tasks.data.totalPages > 0 && page > tasks.data.totalPages) {
      router.replace("/tasks?view=" + view + "&page=" + tasks.data.totalPages, { scroll: false })
    }
  }, [tasks.data, tasks.isPlaceholderData, page, view, router])

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups and preparation for active applications. Due states use each task's own time zone."
        actions={
          <Button onClick={() => openTaskDialog()}>
            <PlusIcon data-icon="inline-start" />
            Add task
          </Button>
        }
      />
      <ViewTabs label="Task views" views={VIEWS} current={view} hrefFor={(value) => "/tasks?view=" + value} />
      <Card>
        <CardContent>
          {tasks.isPending ? (
            <LoadingRegion label="Loading tasks" className="gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </LoadingRegion>
          ) : tasks.isError ? (
            <ErrorState title="We couldn't load tasks" error={tasks.error} onRetry={() => tasks.refetch()} />
          ) : tasks.data.total === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle><h2>{VIEWS.find((item) => item.value === view)!.empty}</h2></EmptyTitle>
                <EmptyDescription>Tasks on archived applications are hidden until you restore them.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              <TaskList tasks={tasks.data.items} />
              <PaginationBar page={tasks.data.page} totalPages={tasks.data.totalPages} total={tasks.data.total} noun="task"
                onPageChange={(next) => router.push("/tasks?view=" + view + "&page=" + next, { scroll: false })} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

