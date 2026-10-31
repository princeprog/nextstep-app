"use client"

import { useEffect } from "react"

export const DISCARD_MESSAGE = "You have unsaved changes. Leave without saving?"

/**
 * Warns before leaving a dirty form: browser navigation (reload, close, external links) uses beforeunload,
 * and in-app link clicks are confirmed before the router handles them.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) {
      return
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!target || target.getAttribute("target") === "_blank" || event.defaultPrevented) {
        return
      }
      if (!window.confirm(DISCARD_MESSAGE)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("click", onClick, true)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("click", onClick, true)
    }
  }, [dirty])
}

