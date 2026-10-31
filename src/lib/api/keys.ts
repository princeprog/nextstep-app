/** Query keys are scoped so a mutation can invalidate exactly the views it affects. */
export const keys = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  applications: ["applications"] as const,
  applicationList: (params: object) => ["applications", "list", params] as const,
  application: (id: string) => ["applications", "detail", id] as const,
  applicationTasks: (id: string, page: number) => ["applications", "detail", id, "tasks", page] as const,
  applicationInterviews: (id: string, page: number) => ["applications", "detail", id, "interviews", page] as const,
  applicationOptions: ["applications", "options"] as const,
  tasks: ["tasks"] as const,
  taskList: (view: string, page: number) => ["tasks", "list", view, page] as const,
  interviews: ["interviews"] as const,
  interviewList: (view: string, page: number) => ["interviews", "list", view, page] as const,
}

