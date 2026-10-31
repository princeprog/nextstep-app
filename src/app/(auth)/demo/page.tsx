import type { Metadata } from "next"

import { DemoStart } from "@/features/auth/demo-start"

export const metadata: Metadata = { title: "Try the demo" }

export default function DemoPage() {
  return <DemoStart />
}

