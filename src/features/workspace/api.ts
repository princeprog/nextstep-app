"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api/client"
import { keys } from "@/lib/api/keys"
import type {
  Application,
  ApplicationCreate,
  ApplicationPage,
  ApplicationPatch,
  ApplicationStatus,
  Dashboard,
  Interview,
  InterviewCreate,
  InterviewPage,
  InterviewPatch,
  Task,
  TaskCreate,
  TaskPage,
  TaskPatch,
} from "@/lib/api/types"
import { type ListParams, toApiQuery } from "@/features/applications/list-params"

/** Time-based sections (overdue, upcoming) change without user action, so they refresh while visible. */
const TIME_SENSITIVE_REFRESH = 60_000

/**
 * After a confirmed write, refresh every view that can show the changed data. Archive, status, and task changes
 * affect lists, details, the parent application's next task, and dashboard counts.
 */
export function invalidateWorkspace(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.applications }),
    queryClient.invalidateQueries({ queryKey: keys.tasks }),
    queryClient.invalidateQueries({ queryKey: keys.interviews }),
    queryClient.invalidateQueries({ queryKey: keys.dashboard }),
  ])
}

function useWorkspaceMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => invalidateWorkspace(queryClient) })
}

// Dashboard

export function useDashboard() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: ({ signal }) => api.get<Dashboard>("/dashboard", { signal }),
    refetchInterval: TIME_SENSITIVE_REFRESH,
  })
}

// Applications

export function useApplications(params: ListParams) {
  return useQuery({
    queryKey: keys.applicationList(params),
    queryFn: ({ signal }) => api.get<ApplicationPage>("/applications", { signal, query: toApiQuery(params) }),
    placeholderData: keepPreviousData,
  })
}

/** How many matches the application picker shows at once. */
export const APPLICATION_PICKER_PAGE_SIZE = 20

/**
 * Active applications for the task and interview pickers, A–Z. The API matches the search against company, role,
 * and contact. Changing the search cancels the previous request, and each search keeps its own cached results, so a
 * slow response for older text never replaces newer results.
 */
export function useApplicationSearch(search: string) {
  const term = search.trim()
  return useQuery({
    queryKey: keys.applicationSearch(term),
    queryFn: ({ signal }) =>
      api.get<ApplicationPage>("/applications", {
        signal,
        query: {
          search: term || undefined,
          archive: "active",
          pageSize: APPLICATION_PICKER_PAGE_SIZE,
          sort: "company",
          direction: "asc",
        },
      }),
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: keys.application(id),
    queryFn: ({ signal }) => api.get<Application>("/applications/" + id, { signal }),
  })
}

export function useApplicationTasks(id: string, page: number) {
  return useQuery({
    queryKey: keys.applicationTasks(id, page),
    queryFn: ({ signal }) => api.get<TaskPage>("/applications/" + id + "/tasks", { signal, query: { page, pageSize: 50 } }),
    refetchInterval: TIME_SENSITIVE_REFRESH,
    placeholderData: keepPreviousData,
  })
}

export function useApplicationInterviews(id: string, page: number) {
  return useQuery({
    queryKey: keys.applicationInterviews(id, page),
    queryFn: ({ signal }) =>
      api.get<InterviewPage>("/applications/" + id + "/interviews", { signal, query: { page, pageSize: 50 } }),
    placeholderData: keepPreviousData,
  })
}

export function useDuplicateCount(company: string, jobTitle: string, excludeId?: string) {
  const enabled = company.trim().length > 0 && jobTitle.trim().length > 0
  return useQuery({
    queryKey: keys.applicationDuplicates(company.trim().toLowerCase(), jobTitle.trim().toLowerCase(), excludeId),
    queryFn: ({ signal }) =>
      api.get<{ count: number }>("/applications/duplicates", { signal, query: { company, jobTitle, excludeId } }),
    enabled,
    staleTime: 10_000,
  })
}

export function useCreateApplication() {
  return useWorkspaceMutation((input: ApplicationCreate) => api.post<Application>("/applications", input))
}

export function useUpdateApplication(id: string) {
  return useWorkspaceMutation((input: ApplicationPatch) => api.patch<Application>("/applications/" + id, input))
}

export function useChangeStatus() {
  return useWorkspaceMutation((input: { id: string; status: ApplicationStatus; appliedDate?: string }) =>
    api.patch<Application>("/applications/" + input.id + "/status", {
      status: input.status,
      ...(input.appliedDate ? { appliedDate: input.appliedDate } : {}),
    }),
  )
}

export function useArchiveApplication() {
  return useWorkspaceMutation((id: string) => api.post<Application>("/applications/" + id + "/archive"))
}

export function useRestoreApplication() {
  return useWorkspaceMutation((id: string) => api.post<Application>("/applications/" + id + "/restore"))
}

// Tasks

export type TaskView = "all" | "open" | "completed" | "overdue" | "upcoming"

export function useTasks(view: TaskView, page: number) {
  return useQuery({
    queryKey: keys.taskList(view, page),
    queryFn: ({ signal }) => api.get<TaskPage>("/tasks", { signal, query: { view, page, pageSize: 20 } }),
    refetchInterval: TIME_SENSITIVE_REFRESH,
    placeholderData: keepPreviousData,
  })
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: keys.task(id),
    queryFn: ({ signal }) => api.get<Task>("/tasks/" + id, { signal }),
    enabled: Boolean(id),
  })
}

export function useCreateTask() {
  return useWorkspaceMutation((input: TaskCreate) => api.post<Task>("/tasks", input))
}

export function useUpdateTask() {
  return useWorkspaceMutation((input: { id: string; patch: TaskPatch }) => api.patch<Task>("/tasks/" + input.id, input.patch))
}

export function useSetTaskCompleted() {
  return useWorkspaceMutation((input: { id: string; completed: boolean }) =>
    api.post<Task>("/tasks/" + input.id + (input.completed ? "/complete" : "/reopen")),
  )
}

export function useDeleteTask() {
  return useWorkspaceMutation((id: string) => api.delete("/tasks/" + id))
}

// Interviews

export type InterviewView = "all" | "future" | "next7days" | "past"

export function useInterviews(view: InterviewView, page: number) {
  return useQuery({
    queryKey: keys.interviewList(view, page),
    queryFn: ({ signal }) => api.get<InterviewPage>("/interviews", { signal, query: { view, page, pageSize: 20 } }),
    refetchInterval: TIME_SENSITIVE_REFRESH,
    placeholderData: keepPreviousData,
  })
}

export function useInterview(id: string | null) {
  return useQuery({
    queryKey: keys.interview(id),
    queryFn: ({ signal }) => api.get<Interview>("/interviews/" + id, { signal }),
    enabled: Boolean(id),
  })
}

export function useCreateInterview() {
  return useWorkspaceMutation((input: InterviewCreate) => api.post<Interview>("/interviews", input))
}

export function useUpdateInterview() {
  return useWorkspaceMutation((input: { id: string; patch: InterviewPatch }) =>
    api.patch<Interview>("/interviews/" + input.id, input.patch),
  )
}

export function useDeleteInterview() {
  return useWorkspaceMutation((id: string) => api.delete("/interviews/" + id))
}

