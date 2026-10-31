import { cn } from "@/lib/utils"

/**
 * Placeholder shown while a section loads. The label is real text for screen readers (aria-label is ignored on a
 * plain div), and aria-busy marks the region until the data replaces it.
 */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-busy="true" className={cn("flex flex-col", className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
