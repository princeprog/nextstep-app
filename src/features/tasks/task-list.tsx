"use client"

import { MoreHorizontalIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { DueBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useDeleteTask, useSetTaskCompleted } from "@/features/workspace/api"
import { errorMessage } from "@/lib/api/errors"
import type { Task } from "@/lib/api/types"
import { formatTaskDue } from "@/lib/time"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/stores/ui-store"

export function TaskList({ tasks, showApplication = true }: { tasks: Task[]; showApplication?: boolean }) {
  return (
    <ul className="divide-y">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} showApplication={showApplication} />
      ))}
    </ul>
  )
}

function TaskRow({ task, showApplication }: { task: Task; showApplication: boolean }) {
  const setCompleted = useSetTaskCompleted()
  const deleteTask = useDeleteTask()
  const openTaskDialog = useUiStore((state) => state.openTaskDialog)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const completed = task.status === "COMPLETED"
  const readOnly = task.application.archived

  async function toggle(next: boolean) {
    try {
      await setCompleted.mutateAsync({ id: task.id, completed: next })
      toast.success(next ? "Marked “" + task.title + "” complete" : "Reopened “" + task.title + "”")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="flex h-6 items-center">
        {setCompleted.isPending ? (
          <Spinner aria-label="Saving" />
        ) : (
          <Checkbox
            checked={completed}
            disabled={readOnly}
            onCheckedChange={(checked) => toggle(Boolean(checked))}
            aria-label={(completed ? "Reopen task: " : "Mark complete: ") + task.title}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("font-medium break-words", completed && "text-muted-foreground line-through")}>{task.title}</p>
          <DueBadge state={task.dueState} />
        </div>
        <p className="text-sm text-muted-foreground">
          Due {formatTaskDue(task)} <span className="whitespace-nowrap">({task.timeZone.replaceAll("_", " ")})</span>
        </p>
        {showApplication ? (
          <Link href={"/applications/" + task.applicationId}
            className="w-fit text-sm text-primary underline-offset-4 hover:underline">
            {task.application.company} — {task.application.jobTitle}
          </Link>
        ) : null}
        {task.note ? <p className="text-sm whitespace-pre-wrap text-muted-foreground">{task.note}</p> : null}
      </div>
      {readOnly ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={"Actions for task: " + task.title} />}>
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openTaskDialog({ taskId: task.id })}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>Delete</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        description={"“" + task.title + "” will be permanently deleted."}
        confirmLabel="Delete task"
        destructive
        onConfirm={async () => {
          try {
            await deleteTask.mutateAsync(task.id)
            toast.success("Task deleted")
          } catch (error) {
            toast.error(errorMessage(error))
            throw error
          }
        }}
      />
    </li>
  )
}

