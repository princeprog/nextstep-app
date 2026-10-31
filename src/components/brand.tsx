import { cn } from "@/lib/utils"

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-primary text-xs text-primary-foreground">
        N
      </span>
      NextStep
    </span>
  )
}

