"use client"

import { Loader2Icon } from "lucide-react"
import { useMemo, useState } from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxStatus,
} from "@/components/ui/combobox"
import { useApplicationSearch } from "@/features/workspace/api"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { errorMessage } from "@/lib/api/errors"
import type { Application } from "@/lib/api/types"

type Option = Pick<Application, "id" | "company" | "jobTitle">

/** Typing pauses this long before the API is searched. */
export const PICKER_SEARCH_DELAY_MS = 250

const optionLabel = (option: Option) => option.company + " — " + option.jobTitle

/**
 * Picks an active application for a new task or interview. Matching happens in the API (company, role, or contact),
 * so every active application can be found, not only the first page of results.
 */
export function ApplicationPicker({
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
  const [query, setQuery] = useState("")
  const [chosen, setChosen] = useState<Option | null>(null)
  const typed = query.trim()
  const search = useDebouncedValue(typed, PICKER_SEARCH_DELAY_MS)
  const results = useApplicationSearch(search)

  const selected = value && chosen?.id === value ? chosen : null
  // Only results for exactly what is typed can be chosen; older results would let a quick Enter pick the wrong one.
  const current = typed === search ? results.data : undefined
  const items = useMemo(() => {
    const list: Option[] = current?.items ?? []
    // While browsing (no search text), keep the current choice in the list so it shows as selected.
    return selected && !typed && !list.some((item) => item.id === selected.id) ? [...list, selected] : list
  }, [current, selected, typed])

  // Typing shows "Searching…" right away; the request itself starts once typing pauses.
  const loading = typed !== search || results.isPending || (results.isError && results.isFetching)
  const status = (() => {
    if (loading) {
      return (
        <>
          <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
          {typed ? "Searching…" : "Loading applications…"}
        </>
      )
    }
    if (results.isError) {
      return errorMessage(results.error) + " Close and reopen the list to try again."
    }
    if (!current) {
      return null
    }
    const { items: page, total } = current
    if (total > page.length) {
      return search
        ? "Showing " + page.length + " of " + total + " matches. Keep typing to narrow the list."
        : "Showing the first " + page.length + " of " + total + " active applications, A–Z. Type to search."
    }
    return null
  })()
  // Rendering Empty also keeps Escape inside the list when nothing matches, instead of closing the whole dialog.
  const empty = !loading && !results.isError && current?.total === 0
    ? search ? "No active applications match “" + search + "”." : "No active applications yet. Add one from Applications first."
    : null

  return (
    <Combobox
      items={items}
      filter={null}
      value={selected}
      itemToStringLabel={optionLabel}
      isItemEqualToValue={(item, other) => item.id === other.id}
      onValueChange={(next) => {
        setChosen(next)
        setQuery("")
        onChange(next?.id ?? "")
      }}
      onInputValueChange={(text, details) => {
        if (details.reason === "input-change") {
          setQuery(text)
        } else if (details.reason === "input-clear" || details.reason === "clear-press") {
          setQuery("")
        }
      }}
      onOpenChange={(open) => {
        if (!open) {
          // A search that wasn't used is dropped; the input shows the current choice again.
          setQuery("")
        } else if (results.isError) {
          void results.refetch()
        }
      }}
    >
      <ComboboxInput
        id={id}
        className="w-full"
        placeholder="Search by company or role"
        triggerLabel="Show applications"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <ComboboxContent aria-busy={loading || results.isFetching || undefined}>
        <ComboboxStatus>{status}</ComboboxStatus>
        <ComboboxEmpty>{empty}</ComboboxEmpty>
        <ComboboxList>
          {(item: Option) => (
            <ComboboxItem key={item.id} value={item}>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium break-words">{item.company}</span>
                <span className="text-xs break-words text-muted-foreground">
                  <span className="sr-only">— </span>
                  {item.jobTitle}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
