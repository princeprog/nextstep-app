import { Badge } from "@/components/ui/badge"
import type { ApplicationStatus, DueState } from "@/lib/api/types"
import { DUE_STATE_LABELS, STATUS_LABELS } from "@/lib/labels"

const STATUS_VARIANT: Record<ApplicationStatus, "default" | "secondary" | "outline"> = {
  SAVED: "outline",
  APPLIED: "secondary",
  INTERVIEW: "default",
  OFFER: "default",
  REJECTED: "outline",
  WITHDRAWN: "outline",
}

/** Status is always written out; color is only a secondary cue. */
export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
}

const DUE_VARIANT: Record<DueState, "default" | "secondary" | "outline" | "destructive"> = {
  OVERDUE: "destructive",
  DUE_TODAY: "default",
  UPCOMING: "secondary",
  LATER: "outline",
  COMPLETED: "outline",
}

export function DueBadge({ state }: { state: DueState }) {
  return <Badge variant={DUE_VARIANT[state]}>{DUE_STATE_LABELS[state]}</Badge>
}

