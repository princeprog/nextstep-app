"use client"

import { ListChecksIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Fragment, useEffect } from "react"

import { ErrorState } from "@/components/error-state"
import { LoadingRegion } from "@/components/loading-region"
import { PageHeader } from "@/components/page-header"
import { DueBadge } from "@/components/status-badge"
import { TablePagination } from "@/components/table-pagination"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMe } from "@/features/auth/api"
import { type TaskView, useTasks } from "@/features/workspace/api"
import type { Task } from "@/lib/api/types"
import { parsePage } from "@/lib/pagination"
import { formatDate, formatTime } from "@/lib/time"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/stores/ui-store"

import { TaskActions, TaskCompleteToggle } from "./task-list"

const PAGE_SIZES = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 20

/** Tasks URL with only non-default values, so links stay short. */
function tasksUrl(view: TaskView, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const query = new URLSearchParams()
  if (view !== "open") query.set("view", view)
  if (page > 1) query.set("page", String(page))
  if (pageSize !== DEFAULT_PAGE_SIZE) query.set("pageSize", String(pageSize))
  const qs = query.toString()
  return qs ? "/tasks?" + qs : "/tasks"
}

const VIEWS: { value: TaskView; label: string; empty: string; hint: string }[] = [
  { value: "open", label: "Open tasks", empty: "No open tasks", hint: "Add a follow-up or a prep step to keep each application moving." },
  { value: "overdue", label: "Overdue", empty: "Nothing overdue", hint: "You're caught up. Overdue tasks appear here as soon as their due time passes." },
  { value: "upcoming", label: "Next 7 days", empty: "Nothing due this week", hint: "Tasks due today or in the next six days appear here." },
  { value: "completed", label: "Completed", empty: "No completed tasks yet", hint: "Tasks you check off appear here, and you can reopen them." },
  { value: "all", label: "All tasks", empty: "No tasks yet", hint: "Add one here or from an application's page." },
]

export function TasksView() {
  const router = useRouter()
  const search = useSearchParams()
  const view = (VIEWS.find((item) => item.value === search.get("view"))?.value ?? "open") as TaskView
  const page = parsePage(search.get("page"))
  const requestedSize = Number(search.get("pageSize"))
  const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE
  const tasks = useTasks(view, page, pageSize)
  const openTaskDialog = useUiStore((state) => state.openTaskDialog)
  const current = VIEWS.find((item) => item.value === view)!

  useEffect(() => {
    if (tasks.data && !tasks.isPlaceholderData && tasks.data.totalPages > 0 && page > tasks.data.totalPages) {
      router.replace(tasksUrl(view, tasks.data.totalPages, pageSize), { scroll: false })
    }
  }, [tasks.data, tasks.isPlaceholderData, page, view, pageSize, router])

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups and preparation for your active applications."
        actions={
          <Button onClick={() => openTaskDialog()}>
            <PlusIcon data-icon="inline-start" />
            Add task
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <h2 className="sr-only">{current.label}</h2>
            <Field className="w-full sm:w-52">
              <FieldLabel htmlFor="task-view" className="sr-only">Show</FieldLabel>
              <Select items={VIEWS.map(({ value, label }) => ({ value, label }))} value={view}
                onValueChange={(value) => value && router.push(tasksUrl(value as TaskView, 1, pageSize), { scroll: false })}>
                <SelectTrigger id="task-view" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    {VIEWS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
        <Card className="gap-0 py-0">
              <section aria-label="Task results" aria-busy={tasks.isFetching}>
                {tasks.isPending ? (
                  <LoadingRegion label="Loading tasks" className="gap-3 p-4">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                  </LoadingRegion>
                ) : tasks.isError ? (
                  <div className="p-4">
                    <ErrorState title="We couldn't load tasks" error={tasks.error} onRetry={() => tasks.refetch()} />
                  </div>
                ) : tasks.data.total === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><ListChecksIcon /></EmptyMedia>
                      <EmptyTitle><h3>{current.empty}</h3></EmptyTitle>
                      <EmptyDescription>
                        {current.hint} Tasks on archived applications stay hidden until you restore them.
                      </EmptyDescription>
                    </EmptyHeader>
                    {view === "open" || view === "all" ? (
                      <EmptyContent>
                        <Button variant="outline" onClick={() => openTaskDialog()}>
                          <PlusIcon data-icon="inline-start" />
                          Add task
                        </Button>
                      </EmptyContent>
                    ) : null}
                  </Empty>
                ) : (
                  <>
                    <TasksTable tasks={tasks.data.items} />
                    <TasksList tasks={tasks.data.items} />
                  </>
                )}
              </section>
        </Card>
        {tasks.data && !tasks.isError && tasks.data.total > 0 ? (
          <TablePagination page={tasks.data.page} totalPages={tasks.data.totalPages} total={tasks.data.total}
            pageSize={pageSize} pageSizes={PAGE_SIZES} noun="task"
            hrefFor={(next) => tasksUrl(view, next, pageSize)}
            onPageChange={(next) => router.push(tasksUrl(view, next, pageSize), { scroll: false })}
            onPageSizeChange={(size) => router.push(tasksUrl(view, 1, size), { scroll: false })} />
        ) : null}
      </div>
      <span className="sr-only" role="status">{tasks.isFetching && !tasks.isPending ? "Updating tasks\u2026" : ""}</span>
    </>
  )
}

/** Due date and time, plus the task's time zone when it differs from the account's. */
function TaskDue({ task, accountZone }: { task: Task; accountZone?: string }) {
  const otherZone = accountZone && task.timeZone !== accountZone ? task.timeZone.replaceAll("_", " ") : null
  return (
    <span className="flex flex-col">
      <span>{formatDate(task.dueDate)}</span>
      {task.dueTime || otherZone ? (
        <span className="text-xs text-muted-foreground">
          {[task.dueTime ? formatTime(task.dueTime) : null, otherZone].filter(Boolean).join(" \u00b7 ")}
        </span>
      ) : null}
    </span>
  )
}

function TaskTitle({ task }: { task: Task }) {
  const completed = task.status === "COMPLETED"
  return (
    <span className={cn("font-medium break-words", completed && "text-muted-foreground line-through")}>{task.title}</span>
  )
}

function ApplicationLink({ task }: { task: Task }) {
  return (
    <Link href={"/applications/" + task.applicationId}
      className="w-fit break-words underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
      <span className="font-medium text-foreground">{task.application.company}</span>
      <span className="block text-muted-foreground">{task.application.jobTitle}</span>
    </Link>
  )
}

function TasksTable({ tasks }: { tasks: Task[] }) {
  const accountZone = useMe().data?.timeZone
  return (
    <div className="hidden lg:block">
      <Table className="table-fixed">
        <caption className="sr-only">Tasks with their application, due date, and due state</caption>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-12 pl-4"><span className="sr-only">Done</span></TableHead>
            <TableHead>Task</TableHead>
            <TableHead className="w-[28%]">Application</TableHead>
            <TableHead className="w-40">Due</TableHead>
            <TableHead className="hidden w-32 xl:table-cell">State</TableHead>
            <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="py-3 pl-4 align-top">
                <span className="flex h-5 items-center"><TaskCompleteToggle task={task} /></span>
              </TableCell>
              <TableCell className="py-3 align-top whitespace-normal">
                <span className="flex flex-col gap-1">
                  <TaskTitle task={task} />
                  {task.note ? <span className="line-clamp-2 text-sm text-muted-foreground">{task.note}</span> : null}
                  <span className="xl:hidden"><DueBadge state={task.dueState} /></span>
                </span>
              </TableCell>
              <TableCell className="py-3 align-top whitespace-normal"><ApplicationLink task={task} /></TableCell>
              <TableCell className="py-3 align-top"><TaskDue task={task} accountZone={accountZone} /></TableCell>
              <TableCell className="hidden py-3 align-top xl:table-cell"><DueBadge state={task.dueState} /></TableCell>
              <TableCell className="py-2 align-top"><TaskActions task={task} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TasksList({ tasks }: { tasks: Task[] }) {
  const accountZone = useMe().data?.timeZone
  return (
    <ItemGroup className="gap-0 lg:hidden">
      {tasks.map((task, index) => (
        <Fragment key={task.id}>
          {index > 0 ? <Separator aria-hidden="true" /> : null}
          <Item role="listitem" className="items-start p-4">
            <ItemMedia className="pt-0.5"><TaskCompleteToggle task={task} /></ItemMedia>
            <ItemContent className="min-w-0">
              <ItemTitle className="line-clamp-none"><TaskTitle task={task} /></ItemTitle>
              {task.note ? <ItemDescription>{task.note}</ItemDescription> : null}
            </ItemContent>
            <ItemActions><TaskActions task={task} /></ItemActions>
            <ItemFooter className="flex-col items-start gap-2 pl-7 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <DueBadge state={task.dueState} />
                <TaskDue task={task} accountZone={accountZone} />
              </span>
              <ApplicationLink task={task} />
            </ItemFooter>
          </Item>
        </Fragment>
      ))}
    </ItemGroup>
  )
}

