"use client"

import { BriefcaseIcon, PlusIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { ButtonLink } from "@/components/button-link"

import { ErrorState } from "@/components/error-state"
import { LoadingRegion } from "@/components/loading-region"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
import { DueBadge, StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useApplications } from "@/features/workspace/api"
import type { Application } from "@/lib/api/types"
import { formatUpdated } from "@/lib/format"
import { ARRANGEMENT_LABELS, EMPLOYMENT_LABELS, STATUS_LABELS, STATUS_ORDER } from "@/lib/labels"
import { formatDate, formatTaskDue } from "@/lib/time"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/stores/ui-store"

import {
  changeListParams,
  clearFilters,
  hasActiveFilters,
  type ListParams,
  parseListParams,
  serializeListParams,
  SORT_OPTIONS,
} from "./list-params"
import { StatusControl } from "./status-control"

export function ApplicationsView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useMemo(() => parseListParams(new URLSearchParams(searchParams.toString())), [searchParams])
  const setApplicationsQuery = useUiStore((state) => state.setApplicationsQuery)
  const query = useApplications(params)
  const [searchText, setSearchText] = useState(params.search)
  const [showFilters, setShowFilters] = useState(false)
  const lastPushedSearch = useRef(params.search)

  useEffect(() => {
    setApplicationsQuery(searchParams.toString())
  }, [searchParams, setApplicationsQuery])

  function navigate(next: ListParams, replace = false) {
    const qs = serializeListParams(next).toString()
    const url = qs ? pathname + "?" + qs : pathname
    if (replace) {
      router.replace(url, { scroll: false })
    } else {
      router.push(url, { scroll: false })
    }
  }

  // Back/forward navigation changes the URL; keep the search box in step with it.
  useEffect(() => {
    if (params.search !== lastPushedSearch.current) {
      lastPushedSearch.current = params.search
      setSearchText(params.search)
    }
  }, [params.search])

  // Debounce typing by 300 ms; superseded requests are cancelled and never replace newer results. The search is
  // applied to the URL state current when the timer fires, so a filter changed while typing is kept.
  const commitSearch = useEffectEvent((text: string) => {
    lastPushedSearch.current = text
    navigate(changeListParams(params, { search: text }), true)
  })
  useEffect(() => {
    if (searchText === params.search) {
      return
    }
    const timer = window.setTimeout(() => commitSearch(searchText), 300)
    return () => window.clearTimeout(timer)
  }, [searchText, params.search])

  // If an edit empties the current page, move to the last page that still has results.
  const totalPages = query.data?.totalPages ?? 0
  const showLastPage = useEffectEvent(() => navigate({ ...params, page: totalPages }, true))
  useEffect(() => {
    if (query.data && !query.isPlaceholderData && totalPages > 0 && params.page > totalPages) {
      showLastPage()
    }
  }, [query.data, query.isPlaceholderData, totalPages, params.page])

  const update = (change: Partial<ListParams>) => navigate(changeListParams(params, change))
  const filtered = hasActiveFilters(params)
  const sortValue = params.sort + ":" + params.direction

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every role you're tracking, with its status and next step."
        actions={
          <ButtonLink href="/applications/new">
            <PlusIcon data-icon="inline-start" />
            Add application
          </ButtonLink>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <form role="search" className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
            <Field>
              <FieldLabel htmlFor="search">Search</FieldLabel>
              <InputGroup>
                <InputGroupInput id="search" type="search" value={searchText} placeholder="Company, role, or contact"
                  onChange={(event) => setSearchText(event.target.value)} />
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Button type="button" variant="outline" className="w-fit md:hidden" aria-expanded={showFilters}
              aria-controls="list-options" onClick={() => setShowFilters((value) => !value)}>
              <SlidersHorizontalIcon data-icon="inline-start" />
              {showFilters ? "Hide filters and sort" : "Filters and sort"}
            </Button>
            <div id="list-options" className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", !showFilters && "max-md:hidden")}>
              <Field>
                <FieldLabel htmlFor="filter-status">Status</FieldLabel>
                <NativeSelect id="filter-status" className="w-full" value={params.status}
                  onChange={(event) => update({ status: event.target.value as ListParams["status"] })}>
                  <NativeSelectOption value="">Any status</NativeSelectOption>
                  {STATUS_ORDER.map((status) => (
                    <NativeSelectOption key={status} value={status}>{STATUS_LABELS[status]}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="filter-arrangement">Work arrangement</FieldLabel>
                <NativeSelect id="filter-arrangement" className="w-full" value={params.workArrangement}
                  onChange={(event) => update({ workArrangement: event.target.value as ListParams["workArrangement"] })}>
                  <NativeSelectOption value="">Any arrangement</NativeSelectOption>
                  {Object.entries(ARRANGEMENT_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="filter-employment">Employment type</FieldLabel>
                <NativeSelect id="filter-employment" className="w-full" value={params.employmentType}
                  onChange={(event) => update({ employmentType: event.target.value as ListParams["employmentType"] })}>
                  <NativeSelectOption value="">Any type</NativeSelectOption>
                  {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="filter-location">Location</FieldLabel>
                <Input id="filter-location" defaultValue={params.location} key={"loc-" + params.location}
                  placeholder="City or region"
                  onBlur={(event) => event.target.value !== params.location && update({ location: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      update({ location: event.currentTarget.value })
                    }
                  }} />
              </Field>
              <Field>
                <FieldLabel htmlFor="filter-from">Applied from</FieldLabel>
                <Input id="filter-from" type="date" value={params.appliedFrom}
                  onChange={(event) => update({ appliedFrom: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="filter-to">Applied to</FieldLabel>
                <Input id="filter-to" type="date" value={params.appliedTo}
                  onChange={(event) => update({ appliedTo: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="filter-archive">Show</FieldLabel>
                <NativeSelect id="filter-archive" className="w-full" value={params.archive}
                  onChange={(event) => update({ archive: event.target.value as ListParams["archive"] })}>
                  <NativeSelectOption value="active">Active applications</NativeSelectOption>
                  <NativeSelectOption value="archived">Archived applications</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="sort">Sort by</FieldLabel>
                <NativeSelect id="sort" className="w-full" value={sortValue}
                  onChange={(event) => {
                    const option = SORT_OPTIONS.find((item) => item.value === event.target.value)!
                    update({ sort: option.sort, direction: option.direction })
                  }}>
                  {SORT_OPTIONS.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </form>
          {filtered ? (
            <ActiveFilters params={params} onRemove={update} onClear={() => {
              setSearchText("")
              lastPushedSearch.current = ""
              navigate(clearFilters(params))
            }} />
          ) : null}
        </CardContent>
      </Card>

      <section aria-labelledby="results-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="results-heading" className="text-base font-semibold">
            {params.archive === "archived" ? "Archived applications" : "Results"}
          </h2>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {query.isFetching && !query.isPending ? "Updating…" : ""}
          </span>
        </div>
        {query.isPending ? (
          <LoadingRegion label="Loading applications" className="gap-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </LoadingRegion>
        ) : query.isError ? (
          <ErrorState title="We couldn't load applications" error={query.error} onRetry={() => query.refetch()} />
        ) : query.data.total === 0 ? (
          <ApplicationsEmpty filtered={filtered} archived={params.archive === "archived"} onClear={() => {
            setSearchText("")
            lastPushedSearch.current = ""
            navigate(clearFilters(params))
          }} />
        ) : (
          <>
            <ApplicationsTable items={query.data.items} />
            <ApplicationsCards items={query.data.items} />
            <PaginationBar page={query.data.page} totalPages={query.data.totalPages} total={query.data.total}
              noun="application" onPageChange={(page) => navigate({ ...params, page })} />
          </>
        )}
      </section>
    </>
  )
}

function ActiveFilters({ params, onRemove, onClear }: {
  params: ListParams
  onRemove: (change: Partial<ListParams>) => void
  onClear: () => void
}) {
  const chips: { label: string; change: Partial<ListParams> }[] = []
  if (params.search) chips.push({ label: "Search: " + params.search, change: { search: "" } })
  if (params.status) chips.push({ label: "Status: " + STATUS_LABELS[params.status], change: { status: "" } })
  if (params.workArrangement) chips.push({ label: ARRANGEMENT_LABELS[params.workArrangement], change: { workArrangement: "" } })
  if (params.employmentType) chips.push({ label: EMPLOYMENT_LABELS[params.employmentType], change: { employmentType: "" } })
  if (params.location) chips.push({ label: "Location: " + params.location, change: { location: "" } })
  if (params.appliedFrom) chips.push({ label: "From " + formatDate(params.appliedFrom), change: { appliedFrom: "" } })
  if (params.appliedTo) chips.push({ label: "To " + formatDate(params.appliedTo), change: { appliedTo: "" } })
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
      {chips.map((chip) => (
        <Button key={chip.label} variant="secondary" size="sm" onClick={() => onRemove(chip.change)}
          aria-label={"Remove filter " + chip.label}>
          {chip.label}
          <XIcon data-icon="inline-end" />
        </Button>
      ))}
      <Button variant="link" size="sm" onClick={onClear}>Clear filters</Button>
    </div>
  )
}

function ApplicationsEmpty({ filtered, archived, onClear }: { filtered: boolean; archived: boolean; onClear: () => void }) {
  if (filtered) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle><h3>No applications match these filters</h3></EmptyTitle>
          <EmptyDescription>Try a different search or remove a filter.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClear}>Clear filters</Button>
        </EmptyContent>
      </Empty>
    )
  }
  if (archived) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle><h3>No archived applications</h3></EmptyTitle>
          <EmptyDescription>Applications you archive appear here, ready to restore.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BriefcaseIcon />
        </EmptyMedia>
        <EmptyTitle><h3>No applications yet</h3></EmptyTitle>
        <EmptyDescription>Add the first role you&apos;re interested in. You can track its status and next steps here.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ButtonLink href="/applications/new">
          <PlusIcon data-icon="inline-start" />
          Add application
        </ButtonLink>
      </EmptyContent>
    </Empty>
  )
}

function NextTask({ application }: { application: Application }) {
  if (!application.nextTask) {
    return <span className="text-muted-foreground">No open tasks</span>
  }
  return (
    <span className="flex flex-col gap-1">
      <span className="line-clamp-1">{application.nextTask.title}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {formatTaskDue(application.nextTask)}
        <DueBadge state={application.nextTask.dueState} />
      </span>
    </span>
  )
}

function ApplicationsTable({ items }: { items: Application[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Applied</TableHead>
            <TableHead>Next task</TableHead>
            <TableHead className="hidden xl:table-cell">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((application) => (
            <TableRow key={application.id}>
              <TableCell className="max-w-64 whitespace-normal">
                <Link href={"/applications/" + application.id}
                  className="font-medium text-foreground underline-offset-4 hover:underline">
                  {application.company}
                </Link>
                <div className="text-sm text-muted-foreground">{application.jobTitle}</div>
              </TableCell>
              <TableCell>
                {application.archived ? (
                  <span className="flex items-center gap-2">
                    <StatusBadge status={application.status} />
                    <Badge variant="outline">Archived</Badge>
                  </span>
                ) : (
                  <StatusControl application={application} id={"status-table-" + application.id} />
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {application.appliedDate ? formatDate(application.appliedDate) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="max-w-64 whitespace-normal">
                <NextTask application={application} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">{formatUpdated(application.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ApplicationsCards({ items }: { items: Application[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {items.map((application) => (
        <li key={application.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex min-w-0 flex-col">
            <Link href={"/applications/" + application.id} className="font-medium break-words underline-offset-4 hover:underline">
              {application.company}
            </Link>
            <span className="text-sm break-words text-muted-foreground">{application.jobTitle}</span>
          </div>
          {application.archived ? (
            <span className="flex items-center gap-2">
              <StatusBadge status={application.status} />
              <Badge variant="outline">Archived</Badge>
            </span>
          ) : (
            <StatusControl application={application} id={"status-card-" + application.id} />
          )}
          <div className="text-sm">
            <NextTask application={application} />
          </div>
        </li>
      ))}
    </ul>
  )
}

