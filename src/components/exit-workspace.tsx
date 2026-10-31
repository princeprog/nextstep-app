"use client"

import { createContext, useContext } from "react"

export type ExitWorkspace = (target: string, work?: () => Promise<unknown>) => Promise<void>

/** Provided by the app shell; outside it, leaving only runs the work. */
export const ExitWorkspaceContext = createContext<ExitWorkspace>(async (_target, work) => {
  await work?.()
})

/**
 * Leaves the workspace on purpose (sign-out, account deletion). The optional work (the sign-out request) runs first;
 * then private data is cleared and the browser goes to the target page. Once leaving has started, 401 responses from
 * requests still in flight are expected and no longer redirect elsewhere.
 */
export function useExitWorkspace() {
  return useContext(ExitWorkspaceContext)
}
