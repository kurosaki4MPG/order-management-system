import * as React from "react"

// 画面幅を媒体クエリで購読し、モバイル専用 UI を安全に切り替える。
const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)

  mql.addEventListener("change", callback)

  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
