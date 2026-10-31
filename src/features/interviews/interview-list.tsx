"use client"

import { ExternalLinkIcon, MoreHorizontalIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMe } from "@/features/auth/api"
import { useDeleteInterview } from "@/features/workspace/api"
import { errorMessage } from "@/lib/api/errors"
import type { Interview } from "@/lib/api/types"
import { INTERVIEW_TYPE_LABELS } from "@/lib/labels"
import { formatDate, formatInstant, formatTime } from "@/lib/time"
import { useUiStore } from "@/stores/ui-store"

export function InterviewList({ interviews, showApplication = true }: { interviews: Interview[]; showApplication?: boolean }) {
  return (
    <ul className="divide-y">
      {interviews.map((interview) => (
        <InterviewRow key={interview.id} interview={interview} showApplication={showApplication} />
      ))}
    </ul>
  )
}

function InterviewRow({ interview, showApplication }: { interview: Interview; showApplication: boolean }) {
  const me = useMe()
  const openDialog = useUiStore((state) => state.openInterviewDialog)
  const remove = useDeleteInterview()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const readOnly = interview.application.archived
  const viewerZone = me.data?.timeZone
  const label = INTERVIEW_TYPE_LABELS[interview.type] + " interview"

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{formatDate(interview.localDate)} at {formatTime(interview.localTime)}</p>
          <Badge variant="secondary">{INTERVIEW_TYPE_LABELS[interview.type]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {interview.timeZone.replaceAll("_", " ")}
          {interview.durationMinutes ? " · " + interview.durationMinutes + " min" : ""}
          {viewerZone && viewerZone !== interview.timeZone
            ? " · Your time: " + formatInstant(interview.startsAt, viewerZone)
            : ""}
        </p>
        {showApplication ? (
          <Link href={"/applications/" + interview.applicationId}
            className="w-fit text-sm text-primary underline-offset-4 hover:underline">
            {interview.application.company} — {interview.application.jobTitle}
          </Link>
        ) : null}
        {interview.interviewerName || interview.location ? (
          <p className="text-sm">
            {[interview.interviewerName && "With " + interview.interviewerName, interview.location].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {interview.meetingUrl ? (
          <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
            Meeting link
            <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
        {interview.notes ? <p className="text-sm whitespace-pre-wrap text-muted-foreground">{interview.notes}</p> : null}
      </div>
      {readOnly ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={"Actions for " + label + " on " + formatDate(interview.localDate)} />}>
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openDialog({ interviewId: interview.id })}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>Delete</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this interview?"
        description={"The " + label.toLowerCase() + " on " + formatDate(interview.localDate) + " will be permanently deleted."}
        confirmLabel="Delete interview"
        destructive
        onConfirm={async () => {
          try {
            await remove.mutateAsync(interview.id)
            toast.success("Interview deleted")
          } catch (error) {
            toast.error(errorMessage(error))
            throw error
          }
        }}
      />
    </li>
  )
}

