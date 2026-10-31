import { ButtonLink } from "@/components/button-link"

/** Link-based view switcher: each view has its own URL, so back/forward and sharing work. */
export function ViewTabs<T extends string>({
  label,
  views,
  current,
  hrefFor,
}: {
  label: string
  views: { value: T; label: string }[]
  current: T
  hrefFor: (view: T) => string
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {views.map((view) => {
        const active = view.value === current
        return (
          <ButtonLink
            key={view.value}
            href={hrefFor(view.value)}
            aria-current={active ? "page" : undefined}
            scroll={false}
            size="sm"
            variant={active ? "outline" : "ghost"}
            className={active ? "bg-background" : undefined}
          >
            {view.label}
          </ButtonLink>
        )
      })}
    </nav>
  )
}

