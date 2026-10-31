import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"

import { Providers } from "@/components/providers"
import "./globals.css"

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "NextStep", template: "%s · NextStep" },
  description: "Your private job-search workspace.",
  // The app holds private workspace data and is never meant to be indexed.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#f8f7f2",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={sans.variable + " h-full antialiased"}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

