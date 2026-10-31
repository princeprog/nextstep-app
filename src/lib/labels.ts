import type {
  ApplicationStatus,
  DueState,
  EmploymentType,
  InterviewType,
  SalaryPeriod,
  WorkArrangement,
} from "@/lib/api/types"

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
}

export const STATUS_ORDER: ApplicationStatus[] = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"]

export const ARRANGEMENT_LABELS: Record<WorkArrangement, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
}

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  OTHER: "Other",
}

export const PERIOD_LABELS: Record<SalaryPeriod, string> = {
  HOUR: "per hour",
  MONTH: "per month",
  YEAR: "per year",
}

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  PHONE_SCREEN: "Phone screen",
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  FINAL: "Final",
  OTHER: "Other",
}

export const DUE_STATE_LABELS: Record<DueState, string> = {
  OVERDUE: "Overdue",
  DUE_TODAY: "Due today",
  UPCOMING: "Upcoming",
  LATER: "Scheduled",
  COMPLETED: "Completed",
}

