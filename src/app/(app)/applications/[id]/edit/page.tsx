import type { Metadata } from "next"

import { ApplicationEdit } from "@/features/applications/application-edit"

export const metadata: Metadata = { title: "Edit application" }

export default async function EditApplicationPage({ params }: PageProps<"/applications/[id]/edit">) {
  const { id } = await params
  return <ApplicationEdit id={id} />
}

