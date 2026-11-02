"use client"

import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  BriefcaseIcon,
  ChevronsUpDownIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Fragment, useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { ButtonLink } from "@/components/button-link"

import { ErrorState } from "@/components/error-state"
import { LoadingRegion } from "@/components/loading-region"
import { PageHeader } from "@/components/page-header"
import { DueBadge, StatusBadge } from "@/components/status-badge"
import { TablePagination } from "@/components/table-pagination"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemTitle } from "@/components/ui/item"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useApplications } from "@/features/workspace/api"
import type { Application } from "@/lib/api/types"
import { formatUpdated } from "@/lib/format"
import { ARRANGEMENT_LABELS, EMPLOYMENT_LABELS, STATUS_LABELS, STATUS_ORDER } from "@/lib/labels"
import { formatDate, formatTaskDue } from "@/lib/time"
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

const ARCHIVE_ITEMS = [{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]
const STATUS_ITEMS = [{ value: "", label: "Any status" }, ...STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value] }))]
const ARRANGEMENT_ITEMS = [{ value: "", label: "Any arrangement" }, ...Object.entries(ARRANGEMENT_LABELS).map(([value, label]) => ({ value, label }))]
const EMPLOYMENT_ITEMS = [{ value: "", label: "Any type" }, ...Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => ({ value, label }))]

export function ApplicationsView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useMemo(() => parseListParams(new URLSearchParams(searchParams.toString())), [searchParams])
  const setApplicationsQuery = useUiStore((state) => state.setApplicationsQuery)
  const query = useApplications(params)
  const [searchText, setSearchText] = useState(params.search)
  const lastPushedSearch = useRef(params.search)
  const pendingParams = useRef<ListParams | null>(null)

  useEffect(() => {
    if (pendingParams.current && serializeListParams(pendingParams.current).toString() === serializeListParams(params).toString()) {
      pendingParams.current = null
    }
  }, [params])

  useEffect(() => {
    const onHistoryNavigation = () => { pendingParams.current = null }
    window.addEventListener("popstate", onHistoryNavigation)
    return () => window.removeEventListener("popstate", onHistoryNavigation)
  }, [])

  useEffect(() => {
    setApplicationsQuery(searchParams.toString())
  }, [searchParams, setApplicationsQuery])

  function navigate(next: ListParams, replace = false) {
    pendingParams.current = next
    const url = urlFor(next)
    if (replace) {
      router.replace(url, { scroll: false })
    } else {
      router.push(url, { scroll: false })
    }
  }

  function urlFor(next: ListParams) {
    const qs = serializeListParams(next).toString()
    return qs ? pathname + "?" + qs : pathname
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
    if (text === lastPushedSearch.current) return
    lastPushedSearch.current = text
    navigate(changeListParams(pendingParams.current ?? params, { search: text }), true)
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

  function update(change: Partial<ListParams>) {
    // Commit an in-progress search with the filter so its debounce cannot overwrite the new URL.
    const next = changeListParams(pendingParams.current ?? params, { search: searchText, ...change })
    lastPushedSearch.current = next.search
    setSearchText(next.search)
    navigate(next)
  }
  const filtered = hasActiveFilters(params)
  const sortValue = params.sort + ":" + params.direction

  function resetFilters() {
    setSearchText("")
    lastPushedSearch.current = ""
    navigate(clearFilters(pendingParams.current ?? params))
  }

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

      <div className="flex flex-col gap-4">
        <h2 className="sr-only">{params.archive === "archived" ? "Archived applications" : "Active applications"}</h2>
              <form role="search" onSubmit={(event) => event.preventDefault()}>
                  <FieldGroup className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <Field className="min-w-0 xl:w-80 xl:flex-none">
                      <FieldLabel htmlFor="search" className="sr-only">Search</FieldLabel>
                      <InputGroup>
                        <InputGroupInput id="search" type="search" value={searchText}
                          placeholder="Search company, role, or contact"
                          onChange={(event) => setSearchText(event.target.value)} />
                        <InputGroupAddon><SearchIcon /></InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <div className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap xl:justify-end">
                      <Field className="min-w-0 sm:w-36">
                        <FieldLabel htmlFor="filter-archive" className="sr-only">Show</FieldLabel>
                        <Select items={ARCHIVE_ITEMS} value={params.archive}
                          onValueChange={(value) => value !== null && update({ archive: value as ListParams["archive"] })}>
                          <SelectTrigger id="filter-archive" className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent align="start" alignItemWithTrigger={false}>
                            <SelectGroup>
                              {ARCHIVE_ITEMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field className="min-w-0 sm:w-40">
                        <FieldLabel htmlFor="filter-status" className="sr-only">Status</FieldLabel>
                        <Select items={STATUS_ITEMS} value={params.status}
                          onValueChange={(value) => value !== null && update({ status: value as ListParams["status"] })}>
                          <SelectTrigger id="filter-status" className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent align="start" alignItemWithTrigger={false}>
                            <SelectGroup>
                              {STATUS_ITEMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <MoreFilters params={params} onApply={update} />
                      <Field className="min-w-0 sm:w-52">
                        <FieldLabel htmlFor="sort" className="sr-only">Sort by</FieldLabel>
                        <Select items={SORT_OPTIONS} value={sortValue} onValueChange={(value) => {
                          const option = SORT_OPTIONS.find((item) => item.value === value)
                          if (option) update({ sort: option.sort, direction: option.direction })
                        }}>
                          <SelectTrigger id="sort" className="w-full">
                            <ArrowUpDownIcon className="max-sm:hidden" /><SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end" alignItemWithTrigger={false}>
                            <SelectGroup>
                              {SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </FieldGroup>
              </form>
        {filtered ? <ActiveFilters params={params} onRemove={update} onClear={resetFilters} /> : null}
        <Card className="gap-0 py-0">
              <section aria-label="Application results" aria-busy={query.isFetching}>
                {query.isPending ? (
                  <LoadingRegion label="Loading applications" className="gap-3 p-4">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </LoadingRegion>
                ) : query.isError ? (
                  <div className="p-4">
                    <ErrorState title="We couldn't load applications" error={query.error} onRetry={() => query.refetch()} />
                  </div>
                ) : query.data.total === 0 ? (
                  <ApplicationsEmpty filtered={filtered} archived={params.archive === "archived"} onClear={resetFilters} />
                ) : (
                  <>
                    <ApplicationsTable items={query.data.items} sort={params.sort} direction={params.direction}
                      onSort={(sort, direction) => update({ sort, direction })} />
                    <ApplicationsCards items={query.data.items} />
                  </>
                )}
              </section>
        </Card>
        {query.data && !query.isError && query.data.total > 0 ? (
          <TablePagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total}
            pageSize={params.pageSize} noun="application"
            hrefFor={(page) => urlFor({ ...params, page })}
            onPageChange={(page) => navigate({ ...params, page })}
            onPageSizeChange={(pageSize) => update({ pageSize })} />
        ) : null}
      </div>
      <span className="sr-only" role="status">
        {query.isFetching && !query.isPending ? "Updating applications…" : ""}
      </span>
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
        <Button key={chip.label} variant="secondary" size="sm" className="max-w-full" onClick={() => onRemove(chip.change)}
          aria-label={"Remove filter " + chip.label}>
          <span className="truncate">{chip.label}</span>
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
      <Empty>
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
      <Empty>
        <EmptyHeader>
          <EmptyTitle><h3>No archived applications</h3></EmptyTitle>
          <EmptyDescription>Applications you archive appear here, ready to restore.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <Empty>
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

type SortChange = (sort: ListParams["sort"], direction: ListParams["direction"]) => void

/** Column header that sorts the list. The API offers one direction per column, except Applied, which toggles. */
function SortHeader({ label, column, sort, direction, next, onSort, className }: {
  label: string
  column: ListParams["sort"]
  sort: ListParams["sort"]
  direction: ListParams["direction"]
  next: ListParams["direction"]
  onSort: SortChange
  className?: string
}) {
  const active = sort === column
  const Icon = active ? (direction === "asc" ? ArrowUpIcon : ArrowDownIcon) : ChevronsUpDownIcon
  return (
    <TableHead className={className} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}>
      <Button variant="ghost" size="sm" className="-ml-2.5" onClick={() => onSort(column, next)}>
        {label}
        <Icon data-icon="inline-end" className={active ? undefined : "opacity-50"} />
      </Button>
    </TableHead>
  )
}

function initials(company: string) {
  const words = company.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word))
  return words.slice(0, 2).map((word) => word.replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase()).join("") || "?"
}

function ApplicationsTable({ items, sort, direction, onSort }: {
  items: Application[]
  sort: ListParams["sort"]
  direction: ListParams["direction"]
  onSort: SortChange
}) {
  const sortProps = { sort, direction, onSort }
  return (
    <div className="hidden lg:block">
      <Table className="table-fixed">
        <caption className="sr-only">Applications with their status, applied date, next task, and last update</caption>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <SortHeader label="Company" column="company" next="asc" className="w-[30%] pl-4" {...sortProps} />
            <TableHead className="w-40">Status</TableHead>
            <SortHeader label="Applied" column="appliedDate" className="hidden w-40 xl:table-cell"
              next={sort === "appliedDate" && direction === "desc" ? "asc" : "desc"} {...sortProps} />
            <SortHeader label="Next task" column="nextTaskDue" next="asc" {...sortProps} />
            <SortHeader label="Updated" column="updatedAt" next="desc" className="hidden w-36 2xl:table-cell" {...sortProps} />
            <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((application) => (
            <TableRow key={application.id}>
              <TableCell className="py-3 pl-4 whitespace-normal">
                <span className="flex items-center gap-3">
                  <Avatar aria-hidden="true"><AvatarFallback>{initials(application.company)}</AvatarFallback></Avatar>
                  <span className="flex min-w-0 flex-col">
                    <Link href={"/applications/" + application.id}
                      className="w-fit break-words font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
                      {application.company}
                    </Link>
                    <span className="break-words text-sm text-muted-foreground">{application.jobTitle}</span>
                  </span>
                </span>
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
              <TableCell className="hidden xl:table-cell">
                {application.appliedDate ? formatDate(application.appliedDate) : <span className="text-muted-foreground">{"\u2014"}</span>}
              </TableCell>
              <TableCell className="whitespace-normal">
                <NextTask application={application} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground 2xl:table-cell">{formatUpdated(application.updatedAt)}</TableCell>
              <TableCell><ApplicationActions application={application} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ApplicationsCards({ items }: { items: Application[] }) {
  return (
    <ItemGroup className="gap-0 lg:hidden">
      {items.map((application, index) => (
        <Fragment key={application.id}>
          {index > 0 ? <Separator aria-hidden="true" /> : null}
          <Item role="listitem" className="p-4">
            <ItemHeader className="items-start">
              <ItemContent className="min-w-0">
                <ItemTitle>
                  <Link href={"/applications/" + application.id}
                    className="break-words hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
                    {application.company}
                  </Link>
                </ItemTitle>
                <ItemDescription className="break-words">{application.jobTitle}</ItemDescription>
              </ItemContent>
              <ItemActions><ApplicationActions application={application} /></ItemActions>
            </ItemHeader>
            {application.archived ? (
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge status={application.status} />
                <Badge variant="outline">Archived</Badge>
              </span>
            ) : (
              <StatusControl application={application} id={"status-card-" + application.id} />
            )}
            <ItemFooter className="flex-col items-start gap-2">
              <NextTask application={application} />
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex gap-1"><dt>Applied</dt><dd>{application.appliedDate ? formatDate(application.appliedDate) : "—"}</dd></div>
                <div className="flex gap-1"><dt>Updated</dt><dd>{formatUpdated(application.updatedAt)}</dd></div>
              </dl>
            </ItemFooter>
          </Item>
        </Fragment>
      ))}
    </ItemGroup>
  )
}

type MoreFilterValues = Pick<ListParams, "workArrangement" | "employmentType" | "location" | "appliedFrom" | "appliedTo">

const NO_MORE_FILTERS: MoreFilterValues = { workArrangement: "", employmentType: "", location: "", appliedFrom: "", appliedTo: "" }

function moreFiltersOf(params: ListParams): MoreFilterValues {
  const { workArrangement, employmentType, location, appliedFrom, appliedTo } = params
  return { workArrangement, employmentType, location, appliedFrom, appliedTo }
}

/** Less-used filters, edited as a draft in a popover and applied together so the list doesn't reload on every keystroke. */
function MoreFilters({ params, onApply }: { params: ListParams; onApply: (change: Partial<ListParams>) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MoreFilterValues>(NO_MORE_FILTERS)
  const appliedCount = Object.values(moreFiltersOf(params)).filter(Boolean).length
  const draftCount = Object.values(draft).filter(Boolean).length
  const invalidRange = Boolean(draft.appliedFrom && draft.appliedTo && draft.appliedFrom > draft.appliedTo)
  const setField = (field: keyof MoreFilterValues) => (value: string) => setDraft((current) => ({ ...current, [field]: value }))

  function onOpenChange(next: boolean) {
    if (next) {
      setDraft(moreFiltersOf(params))
    }
    setOpen(next)
  }

  function apply(values: MoreFilterValues) {
    onApply({ ...values, location: values.location.trim() } as Partial<ListParams>)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={<Button variant="outline" className="w-full sm:w-auto" />}>
        <SlidersHorizontalIcon data-icon="inline-start" />
        Filters
        {appliedCount > 0 ? <Badge variant="secondary">{appliedCount}</Badge> : null}
      </PopoverTrigger>
      <PopoverContent align="end"
        className="max-h-(--available-height) w-[min(22rem,calc(100vw-2rem))] gap-4 overflow-y-auto p-4">
        <PopoverHeader>
          <PopoverTitle>More filters</PopoverTitle>
          <PopoverDescription>Narrow the list by role details and when you applied.</PopoverDescription>
        </PopoverHeader>
        <form noValidate className="flex flex-col gap-4" onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!invalidRange) apply(draft)
        }}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="filter-arrangement">Work arrangement</FieldLabel>
              <Select items={ARRANGEMENT_ITEMS} value={draft.workArrangement}
                onValueChange={(value) => value !== null && setField("workArrangement")(value)}>
                <SelectTrigger id="filter-arrangement" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    {ARRANGEMENT_ITEMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="filter-employment">Employment type</FieldLabel>
              <Select items={EMPLOYMENT_ITEMS} value={draft.employmentType}
                onValueChange={(value) => value !== null && setField("employmentType")(value)}>
                <SelectTrigger id="filter-employment" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    {EMPLOYMENT_ITEMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="filter-location">Location</FieldLabel>
              <Input id="filter-location" placeholder="City or region" value={draft.location}
                onChange={(event) => setField("location")(event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="filter-from">Applied from</FieldLabel>
                <Input id="filter-from" type="date" value={draft.appliedFrom}
                  onChange={(event) => setField("appliedFrom")(event.target.value)} />
              </Field>
              <Field data-invalid={invalidRange || undefined}>
                <FieldLabel htmlFor="filter-to">Applied to</FieldLabel>
                <Input id="filter-to" type="date" value={draft.appliedTo} aria-invalid={invalidRange || undefined}
                  aria-describedby={invalidRange ? "filter-range-error" : undefined}
                  onChange={(event) => setField("appliedTo")(event.target.value)} />
              </Field>
            </div>
            {invalidRange ? <FieldError id="filter-range-error">The end date is before the start date.</FieldError> : null}
          </FieldGroup>
          <Separator />
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={appliedCount === 0 && draftCount === 0}
              onClick={() => apply(NO_MORE_FILTERS)}>
              Clear
            </Button>
            <Button type="submit" size="sm" disabled={invalidRange}>Apply filters</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}


function ApplicationActions({ application }: { application: Application }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}
        aria-label={"Actions for " + application.company + " — " + application.jobTitle}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={"/applications/" + application.id} />}>
            View application
          </DropdownMenuItem>
          {!application.archived ? (
            <DropdownMenuItem render={<Link href={"/applications/" + application.id + "/edit"} />}>
              Edit application
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

