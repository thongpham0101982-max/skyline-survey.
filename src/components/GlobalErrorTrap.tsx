"use client"

import { useEffect } from "react"

/**
 * GlobalErrorTrap:
 * Intercepts transient Next.js router/server-action flight errors (e.g. "An unexpected response was received from the server", E394)
 * and stale Turbopack desynchronization events, preventing dev/prod crash overlays and gracefully healing the session.
 */
export function GlobalErrorTrap() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // Dọn tham số cache-busting `_v` trên thanh địa chỉ sau khi trang đã nạp thành công
    const cleanTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem("chunk_reload_count")
        const url = new URL(window.location.href)
        if (url.searchParams.has("_v")) {
          url.searchParams.delete("_v")
          window.history.replaceState({}, "", url.pathname + url.search + url.hash)
        }
      } catch (_) {}
    }, 2000)

    let lastAutoReload = 0

    const isTransientRouterError = (msg: string = "") => {
      const lower = msg.toLowerCase()
      return (
        lower.includes("unexpected response was received from the server") ||
        lower.includes("failed to fetch rsc payload") ||
        lower.includes("failed to find server action") ||
        lower.includes("e394") ||
        lower.includes("chunkloaderror") ||
        lower.includes("failed to load chunk") ||
        lower.includes("module factory is not available") ||
        lower.includes("stale browser cache") ||
        lower.includes("instantiated because it was required") ||
        lower.includes("failed to fetch dynamically imported module") ||
        lower.includes("bad gateway")
      )
    }

    const isAuthFetchError = (msg: string = "") => {
      const lower = msg.toLowerCase()
      return (
        lower.includes("clientfetcherror") ||
        lower.includes("errors.authjs.dev") ||
        (lower.includes("unexpected token '<'") && lower.includes("json"))
      )
    }

    const triggerCleanReload = () => {
      const now = Date.now()
      if (now - lastAutoReload > 5000) {
        lastAutoReload = now
        console.info("[GlobalErrorTrap] Purging stale caches and auto-recovering session...")
        const navigateFresh = () => {
          try {
            const url = new URL(window.location.href)
            url.searchParams.set("_v", String(Date.now()))
            window.location.replace(url.toString())
          } catch (_) {
            window.location.reload()
          }
        }
        if ("caches" in window) {
          caches
            .keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .finally(() => {
              setTimeout(navigateFresh, 150)
            })
        } else {
          setTimeout(navigateFresh, 150)
        }
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const msg = String(reason?.message || reason || "")

      if (isAuthFetchError(msg)) {
        event.preventDefault()
        console.warn("[GlobalErrorTrap] Handled non-fatal Auth.js session fetch rejection:", msg)
        try {
          const portals = document.querySelectorAll("nextjs-portal")
          portals.forEach((p) => p.remove())
        } catch (_) {}
        return
      }

      if (isTransientRouterError(msg)) {
        event.preventDefault()
        console.warn("[GlobalErrorTrap] Intercepted transient server/router response error:", msg)

        try {
          const portals = document.querySelectorAll("nextjs-portal")
          portals.forEach((p) => p.remove())
        } catch (_) {}

        triggerCleanReload()
      }
    }

    const handleError = (event: ErrorEvent) => {
      const msg = String(event.message || event.error?.message || "")

      if (isAuthFetchError(msg)) {
        event.preventDefault()
        console.warn("[GlobalErrorTrap] Handled non-fatal Auth.js error event:", msg)
        try {
          const portals = document.querySelectorAll("nextjs-portal")
          portals.forEach((p) => p.remove())
        } catch (_) {}
        return
      }

      if (isTransientRouterError(msg)) {
        event.preventDefault()
        console.warn("[GlobalErrorTrap] Intercepted runtime window error:", msg)

        try {
          const portals = document.querySelectorAll("nextjs-portal")
          portals.forEach((p) => p.remove())
        } catch (_) {}

        triggerCleanReload()
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)

    const observer = new MutationObserver(() => {
      const portals = document.querySelectorAll("nextjs-portal")
      portals.forEach((portal) => {
        const text = portal.shadowRoot?.textContent || portal.textContent || ""
        if (
          text.includes("unexpected response") ||
          text.includes("E394") ||
          text.includes("ClientFetchError") ||
          text.includes("errors.authjs.dev") ||
          text.includes("<!DOCTYPE")
        ) {
          portal.remove()
        }
      })
    })

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    })

    return () => {
      clearTimeout(cleanTimer)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
      observer.disconnect()
    }
  }, [])

  return null
}
