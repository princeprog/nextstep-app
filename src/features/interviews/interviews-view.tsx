"use client"

import { PlusIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { ErrorState } from "@/components/error-state"
import { LoadingRegion } from "@/components/loading-region"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
import { ViewTabs } from "@/components/view-tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { type InterviewView, useInterviews } from "@/features/workspace/api"
import { parsePage } from "@/lib/pagination"
import { useUiStore } from "@/stores/ui-store"

import { InterviewList } from "./interview-list"

const VIEWS: { value: InterviewView; label: string; empty: string }[] = [
  { value: "future", label: "Upcoming", empty: "No upcoming interviews." },
  { value: "next7days", label: "Next 7 days", empty: "No interviews in the next 7 days." },
  { value: "past", label: "Past", empty: "No past interviews." },
  { value: "all", label: "All", empty: "No interviews recorded yet." },
]

export function InterviewsView() {
  const router = useRouter()
  const search = useSearchParams()
  const view = (VIEWS.find((item) => item.value === search.get("view"))?.value ?? "future") as InterviewView
  const page = parsePage(search.get("page"))
  const interviews = useInterviews(view, page)
  const openDialog = useUiStore((state) => state.openInterviewDialog)

  useEffect(() => {
    const data = interviews.data
    if (data && !interviews.isPlaceholderData && data.totalPages > 0 && page > data.totalPages) {
      router.replace("/interviews?view=" + view + "&page=" + data.totalPages, { scroll: false })
    }
  }, [interviews.data, interviews.isPlaceholderData, page, view, router])

  return (
    <>
      <PageHeader
        title="Interviews"
        description="Times are shown in the time zone they were scheduled in."
        actions={
          <Button onClick={() => openDialog()}>
            <PlusIcon data-icon="inline-start" />
            Add interview
          </Button>
        }
      />
      <ViewTabs label="Interview views" views={VIEWS} current={view} hrefFor={(value) => "/interviews?view=" + value} />
      <Card>
        <CardContent>
          {interviews.isPending ? (
            <LoadingRegion label="Loading interviews" className="gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </LoadingRegion>
          ) : interviews.isError ? (
            <ErrorState title="We couldn't load interviews" error={interviews.error} onRetry={() => interviews.refetch()} />
          ) : interviews.data.total === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle><h2>{VIEWS.find((item) => item.value === view)!.empty}</h2></EmptyTitle>
                <EmptyDescription>Interviews on archived applications are hidden until you restore them.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              <InterviewList interviews={interviews.data.items} />
              <PaginationBar page={interviews.data.page} totalPages={interviews.data.totalPages} total={interviews.data.total}
                noun="interview" onPageChange={(next) => router.push("/interviews?view=" + view + "&page=" + next, { scroll: false })} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

