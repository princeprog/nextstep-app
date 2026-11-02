"use client"

import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DEFAULT_PAGE_SIZES = [10, 20, 50]

/** Page numbers to show: the first, the last, and the current page with its neighbours; gaps become an ellipsis. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages))
  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | "gap")[] = []
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("gap")
    result.push(value)
  })
  return result
}

/**
 * Row count, rows-per-page choice, and numbered pages for a server-paginated table. Page links carry real URLs, so
 * they can be opened in a new tab; a plain click navigates in place through onPageChange.
 */
export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  noun,
  hrefFor,
  onPageChange,
  onPageSizeChange,
  pageSizes = DEFAULT_PAGE_SIZES,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  noun: string
  hrefFor: (page: number) => string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizes?: number[]
}) {
  const sizes = pageSizes.includes(pageSize) ? pageSizes : [...pageSizes, pageSize].sort((a, b) => a - b)
  const sizeItems = sizes.map((size) => ({ value: String(size), label: size + " per page" }))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const nouns = total === 1 ? noun : noun + "s"

  function go(target: number) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
      event.preventDefault()
      onPageChange(target)
    }
  }

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden="true">Showing</span>
        <Select items={sizeItems} value={String(pageSize)} onValueChange={(value) => value && onPageSizeChange(Number(value))}>
          <SelectTrigger size="sm" aria-label="Rows per page"><SelectValue /></SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {sizeItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <span aria-live="polite" className="whitespace-nowrap">{from + "\u2013" + to + " of " + total + " " + nouns}</span>
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm whitespace-nowrap text-muted-foreground">Page {page} of {totalPages}</span>
          <Pagination aria-label="Pagination" className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                {page > 1 ? (
                  <PaginationPrevious href={hrefFor(page - 1)} onClick={go(page - 1)} />
                ) : (
                  <PaginationPrevious aria-disabled="true" className="pointer-events-none opacity-50" />
                )}
              </PaginationItem>
              {pageWindow(page, totalPages).map((item, index) => (
                <PaginationItem key={item === "gap" ? "gap-" + index : item} className="max-sm:hidden">
                  {item === "gap" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink href={hrefFor(item)} isActive={item === page} onClick={go(item)}
                      aria-label={"Page " + item}>
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                {page < totalPages ? (
                  <PaginationNext href={hrefFor(page + 1)} onClick={go(page + 1)} />
                ) : (
                  <PaginationNext aria-disabled="true" className="pointer-events-none opacity-50" />
                )}
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  )
}

