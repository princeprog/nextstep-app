/** Query keys are scoped so a mutation can invalidate exactly the views it affects. */
export const keys = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  applications: ["applications"] as const,
  applicationList: (params: object) => ["applications", "list", params] as const,
  application: (id: string) => ["applications", "detail", id] as const,
  applicationTasks: (id: string, page: number) => ["applications", "detail", id, "tasks", page] as const,
  applicationInterviews: (id: string, page: number) => ["applications", "detail", id, "interviews", page] as const,
  applicationSearch: (search: string) => ["applications", "search", search] as const,
  applicationDuplicates: (company: string, jobTitle: string, excludeId?: string) =>
    ["applications", "duplicates", company, jobTitle, excludeId ?? null] as const,
  tasks: ["tasks"] as const,
  taskList: (view: string, page: number, pageSize = 20) => ["tasks", "list", view, page, pageSize] as const,
  task: (id: string | null) => ["tasks", "detail", id] as const,
  interviews: ["interviews"] as const,
  interviewList: (view: string, page: number) => ["interviews", "list", view, page] as const,
  interview: (id: string | null) => ["interviews", "detail", id] as const,
}

