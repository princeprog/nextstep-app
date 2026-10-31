"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function PaginationBar({
  page,
  totalPages,
  total,
  noun,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  noun: string
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total} {total === 1 ? noun : noun + "s"}
      </p>
    )
  }
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {totalPages} · {total} {noun}s
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeftIcon data-icon="inline-start" />
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </nav>
  )
}

