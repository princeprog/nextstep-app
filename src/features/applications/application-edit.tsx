"use client"

import { ErrorState } from "@/components/error-state"
import { LoadingRegion } from "@/components/loading-region"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useApplication } from "@/features/workspace/api"

import { ApplicationForm } from "./application-form"
import { BackToApplications } from "./application-detail"

export function ApplicationEdit({ id }: { id: string }) {
  const application = useApplication(id)
  if (application.isPending) {
    return (
      <LoadingRegion label="Loading application">
        <Skeleton className="h-96" />
      </LoadingRegion>
    )
  }
  if (application.isError) {
    return <ErrorState title="We couldn't load this application" error={application.error} onRetry={() => application.refetch()} />
  }
  if (application.data.archived) {
    return (
      <>
        <BackToApplications />
        <Alert>
          <AlertDescription>This application is archived. Restore it before editing.</AlertDescription>
        </Alert>
      </>
    )
  }
  return (
    <>
      <BackToApplications />
      <PageHeader title={"Edit " + application.data.company} description={application.data.jobTitle} />
      <ApplicationForm application={application.data} />
    </>
  )
}

