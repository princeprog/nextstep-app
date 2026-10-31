import type { Application } from "@/lib/api/types"
import { PERIOD_LABELS } from "@/lib/labels"

function money(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount))
  } catch {
    return currency + " " + amount
  }
}

export function formatSalary(application: Pick<Application, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">) {
  const { salaryMin, salaryMax, salaryCurrency, salaryPeriod } = application
  if (!salaryCurrency || (!salaryMin && !salaryMax)) {
    return null
  }
  const period = salaryPeriod ? " " + PERIOD_LABELS[salaryPeriod] : ""
  if (salaryMin && salaryMax) {
    return money(salaryMin, salaryCurrency) + " – " + money(salaryMax, salaryCurrency) + period
  }
  if (salaryMin) {
    return "From " + money(salaryMin, salaryCurrency) + period
  }
  return "Up to " + money(salaryMax!, salaryCurrency) + period
}

export function formatUpdated(iso: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso))
}

