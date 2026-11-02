import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { ApplicationForm } from "@/features/applications/application-form"
import { BackToApplications } from "@/features/applications/application-detail"

export const metadata: Metadata = { title: "Add application" }

export default function NewApplicationPage() {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <BackToApplications />
      <PageHeader title="Add an application" description="Save the role now and fill in the rest whenever you have it." />
      <ApplicationForm />
    </div>
  )
}

