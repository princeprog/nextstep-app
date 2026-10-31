"use client"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { zoneOptions } from "@/lib/time"

/** A native select keeps the 400+ IANA zones keyboard-searchable by typing. */
export function TimeZoneSelect({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string
  value: string
  onChange: (zone: string) => void
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <NativeSelect
      id={id}
      className="w-full"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    >
      {zoneOptions(value).map((zone) => (
        <NativeSelectOption key={zone} value={zone}>
          {zone.replaceAll("_", " ")}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

