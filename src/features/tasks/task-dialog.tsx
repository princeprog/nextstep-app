"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ApplicationPicker } from "@/components/application-picker"
import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { LoadingRegion } from "@/components/loading-region"
import { TimeZoneSelect } from "@/components/time-zone-select"
import { DISCARD_MESSAGE } from "@/components/use-unsaved-changes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useMe } from "@/features/auth/api"
import { useCreateTask, useTask, useUpdateTask } from "@/features/workspace/api"
import { errorMessage, isApiError } from "@/lib/api/errors"
import type { Task } from "@/lib/api/types"
import { useUiStore } from "@/stores/ui-store"

type TaskFormValues = { applicationId: string; title: string; note: string; dueDate: string; dueTime: string; timeZone: string }

function initialValues(task: Task | undefined, applicationId: string | null, defaultZone: string): TaskFormValues {
  return {
    applicationId: task?.applicationId ?? applicationId ?? "",
    title: task?.title ?? "",
    note: task?.note ?? "",
    dueDate: task?.dueDate ?? "",
    dueTime: task?.dueTime ?? "",
    timeZone: task?.timeZone ?? defaultZone,
  }
}

export function TaskDialog() {
  const { open, taskId, applicationId } = useUiStore((state) => state.taskDialog)
  const close = useUiStore((state) => state.closeTaskDialog)
  const me = useMe()
  const task = useTask(open ? taskId : null)
  const [dirty, setDirty] = useState(false)

  function requestClose() {
    if (dirty && !window.confirm(DISCARD_MESSAGE)) {
      return
    }
    setDirty(false)
    close()
  }

  const editing = Boolean(taskId)
  const ready = !editing || task.data
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : requestClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "Add a task"}</DialogTitle>
          <DialogDescription>
            Tasks are due on a date in their own time zone. Add a time if the deadline is exact.
          </DialogDescription>
        </DialogHeader>
        {editing && task.isError ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{errorMessage(task.error)}</AlertDescription>
          </Alert>
        ) : !ready ? (
          <LoadingRegion label="Loading task" className="gap-3">
            <Skeleton className="h-8" />
            <Skeleton className="h-16" />
            <Skeleton className="h-8" />
          </LoadingRegion>
        ) : (
          <TaskForm
            key={(taskId ?? "new") + ":" + (applicationId ?? "")}
            task={task.data}
            presetApplicationId={applicationId}
            defaultZone={me.data?.timeZone ?? "UTC"}
            onDirtyChange={setDirty}
            onCancel={requestClose}
            onSaved={() => {
              setDirty(false)
              close()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function TaskForm({
  task,
  presetApplicationId,
  defaultZone,
  onDirtyChange,
  onCancel,
  onSaved,
}: {
  task?: Task
  presetApplicationId: string | null
  defaultZone: string
  onDirtyChange: (dirty: boolean) => void
  onCancel: () => void
  onSaved: () => void
}) {
  const create = useCreateTask()
  const update = useUpdateTask()
  const [values, setValues] = useState(() => initialValues(task, presetApplicationId, defaultZone))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const pending = create.isPending || update.isPending

  const set = (field: keyof TaskFormValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    onDirtyChange(true)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) {
      return
    }
    setFieldErrors({})
    setFormError(null)
    const payload = {
      title: values.title,
      note: values.note.trim() ? values.note : null,
      dueDate: values.dueDate,
      dueTime: values.dueTime || null,
      timeZone: values.timeZone,
    }
    try {
      if (task) {
        await update.mutateAsync({ id: task.id, patch: payload })
        toast.success("Task saved")
      } else {
        await create.mutateAsync({ ...payload, applicationId: values.applicationId })
        toast.success("Task added")
      }
      onSaved()
    } catch (error) {
      if (isApiError(error) && Object.keys(error.fieldErrors).length) {
        setFieldErrors(error.fieldErrors)
      }
      setFormError(errorMessage(error))
    }
  }

  const application = errorProps(fieldErrors, "applicationId", "task-")
  const title = errorProps(fieldErrors, "title", "task-")
  const note = errorProps(fieldErrors, "note", "task-")
  const dueDate = errorProps(fieldErrors, "dueDate", "task-")
  const dueTime = errorProps(fieldErrors, "dueTime", "task-")
  const zone = errorProps(fieldErrors, "timeZone", "task-")
  const showPicker = !task && !presetApplicationId

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        {showPicker ? (
          <Field data-invalid={application.invalid || undefined}>
            <FieldLabel htmlFor="task-application">Application</FieldLabel>
            <ApplicationPicker id="task-application" value={values.applicationId} onChange={set("applicationId")}
              invalid={application.invalid} describedBy={application.invalid ? application.errorId : undefined} />
            <FieldErrorText id={application.errorId} message={application.message} />
          </Field>
        ) : null}
        <Field data-invalid={title.invalid || undefined}>
          <FieldLabel htmlFor="task-title">Task</FieldLabel>
          <Input id="task-title" maxLength={200} value={values.title} placeholder="Send a follow-up email"
            onChange={(event) => set("title")(event.target.value)} {...title.controlProps} />
          <FieldErrorText id={title.errorId} message={title.message} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={dueDate.invalid || undefined}>
            <FieldLabel htmlFor="task-dueDate">Due date</FieldLabel>
            <Input id="task-dueDate" type="date" value={values.dueDate}
              onChange={(event) => set("dueDate")(event.target.value)} {...dueDate.controlProps} />
            <FieldErrorText id={dueDate.errorId} message={dueDate.message} />
          </Field>
          <Field data-invalid={dueTime.invalid || undefined}>
            <FieldLabel htmlFor="task-dueTime">Time (optional)</FieldLabel>
            <Input id="task-dueTime" type="time" value={values.dueTime}
              onChange={(event) => set("dueTime")(event.target.value)} {...dueTime.controlProps} />
            <FieldErrorText id={dueTime.errorId} message={dueTime.message} />
          </Field>
        </div>
        <Field data-invalid={zone.invalid || undefined}>
          <FieldLabel htmlFor="task-timeZone">Time zone</FieldLabel>
          <TimeZoneSelect id="task-timeZone" value={values.timeZone} onChange={set("timeZone")} invalid={zone.invalid}
            describedBy={"task-timeZone-hint" + (zone.invalid ? " " + zone.errorId : "")} />
          <FieldDescription id="task-timeZone-hint">Saved with the task. Changing your profile later won&apos;t move it.</FieldDescription>
          <FieldErrorText id={zone.errorId} message={zone.message} />
        </Field>
        <Field data-invalid={note.invalid || undefined}>
          <FieldLabel htmlFor="task-note">Note (optional)</FieldLabel>
          <Textarea id="task-note" maxLength={2000} rows={3} value={values.note}
            onChange={(event) => set("note")(event.target.value)} {...note.controlProps} />
          <FieldErrorText id={note.errorId} message={note.message} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {task ? "Save task" : "Add task"}
        </Button>
      </DialogFooter>
    </form>
  )
}

