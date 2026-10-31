import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { ApplicationForm } from "@/features/applications/application-form"
import { BackToApplications } from "@/features/applications/application-detail"

export const metadata: Metadata = { title: "Add application" }

export default function NewApplicationPage() {
  return (
    <>
      <BackToApplications />
      <PageHeader title="Add an application" description="Save the role now; you can fill in details later." />
      <ApplicationForm />
    </>
  )
}

