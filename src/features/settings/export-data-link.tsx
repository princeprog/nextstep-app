import type { VariantProps } from "class-variance-authority"
import { DownloadIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Downloads everything stored for the account. The API answers with a JSON attachment for the session's account, so
 * a plain link works without script.
 */
export function ExportDataLink({
  variant = "outline",
  className,
}: Pick<VariantProps<typeof buttonVariants>, "variant"> & { className?: string }) {
  return (
    <a href="/api/v1/me/export" download data-slot="button" className={cn(buttonVariants({ variant }), className)}>
      <DownloadIcon data-icon="inline-start" />
      Download my data
    </a>
  )
}
