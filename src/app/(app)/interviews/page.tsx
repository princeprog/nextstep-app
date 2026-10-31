import type { Metadata } from "next"
import { Suspense } from "react"

import { InterviewsView } from "@/features/interviews/interviews-view"

export const metadata: Metadata = { title: "Interviews" }

export default function Page() {
  return (
    <Suspense>
      <InterviewsView />
    </Suspense>
  )
}

