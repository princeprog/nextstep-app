import { create } from "zustand"

/**
 * Shared, client-only interaction state. Server data stays in TanStack Query; nothing private is persisted here.
 */
type TaskDialogState = { open: boolean; taskId: string | null; applicationId: string | null }
type InterviewDialogState = { open: boolean; interviewId: string | null; applicationId: string | null }

type UiState = {
  taskDialog: TaskDialogState
  interviewDialog: InterviewDialogState
  /** Query string of the last applications list view, so "Back to applications" keeps filters. */
  applicationsQuery: string
  setApplicationsQuery: (query: string) => void
  openTaskDialog: (options?: { taskId?: string; applicationId?: string }) => void
  closeTaskDialog: () => void
  openInterviewDialog: (options?: { interviewId?: string; applicationId?: string }) => void
  closeInterviewDialog: () => void
  reset: () => void
}

const closedTask: TaskDialogState = { open: false, taskId: null, applicationId: null }
const closedInterview: InterviewDialogState = { open: false, interviewId: null, applicationId: null }

export const useUiStore = create<UiState>((set) => ({
  taskDialog: closedTask,
  interviewDialog: closedInterview,
  applicationsQuery: "",
  setApplicationsQuery: (query) => set({ applicationsQuery: query }),
  openTaskDialog: (options) =>
    set({ taskDialog: { open: true, taskId: options?.taskId ?? null, applicationId: options?.applicationId ?? null } }),
  closeTaskDialog: () => set((state) => ({ taskDialog: { ...state.taskDialog, open: false } })),
  openInterviewDialog: (options) =>
    set({
      interviewDialog: {
        open: true,
        interviewId: options?.interviewId ?? null,
        applicationId: options?.applicationId ?? null,
      },
    }),
  closeInterviewDialog: () => set((state) => ({ interviewDialog: { ...state.interviewDialog, open: false } })),
  reset: () => set({ taskDialog: closedTask, interviewDialog: closedInterview, applicationsQuery: "" }),
}))

