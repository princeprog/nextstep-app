"use client"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useApplicationOptions } from "@/features/workspace/api"

/** Picks an active application for a new task or interview. */
export function ApplicationSelect({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string
  value: string
  onChange: (id: string) => void
  invalid?: boolean
  describedBy?: string
}) {
  const options = useApplicationOptions()
  const items = options.data?.items ?? []
  return (
    <>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.isPending}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <NativeSelectOption value="">
          {options.isPending ? "Loading applications…" : items.length ? "Choose an application" : "No active applications yet"}
        </NativeSelectOption>
        {items.map((application) => (
          <NativeSelectOption key={application.id} value={application.id}>
            {application.company} — {application.jobTitle}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {options.data && options.data.total > items.length ? (
        <p className="text-xs text-muted-foreground">
          Showing the first {items.length} applications by company. To add to another one, open it from Applications.
        </p>
      ) : null}
    </>
  )
}

