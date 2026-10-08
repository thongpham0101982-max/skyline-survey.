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
        lower.includes("bad gateway")
      )
    }

    const triggerCleanReload = () => {
      const now = Date.now()
      if (now - lastAutoReload > 10000) {
        lastAutoReload = now
        console.info("[GlobalErrorTrap] Purging stale caches and auto-recovering session...")
        if ('caches' in window) {
          caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => {
            setTimeout(() => {
              window.location.reload()
            }, 200)
          })
        } else {
          setTimeout(() => {
            window.location.reload()
          }, 200)
        }
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const msg = String(reason?.message || reason || "")

      if (isTransientRouterError(msg)) {
        // Prevent default browser/Next.js overlay from popping up
        event.preventDefault()
        console.warn("[GlobalErrorTrap] Intercepted transient server/router response error:", msg)

        // Hide Next.js dev overlay if present
        try {
          const portals = document.querySelectorAll("nextjs-portal")
          portals.forEach(p => p.remove())
        } catch (_) {}

        triggerCleanReload()
      }
    }

    const handleError = (event: ErrorEvent) => {
      const msg = String(event.message || event.error?.message || "")

      if (isTransientRouterError(msg)) {
        event.preventDefault()
        console.warn("[GlobalErrorTrap] Intercepted runtime window error:", msg)

        try {
          const portals = document.querySelectorAll("nextjs-portal")
          portals.forEach(p => p.remove())
        } catch (_) {}

        triggerCleanReload()
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)

    // MutationObserver to suppress Turbopack stale overlay if it mounts
    const observer = new MutationObserver(() => {
      const portals = document.querySelectorAll("nextjs-portal")
      portals.forEach(portal => {
        const text = portal.shadowRoot?.textContent || portal.textContent || ""
        if (text.includes("unexpected response") || text.includes("E394")) {
          portal.remove()
        }
      })
    })

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    })

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
      observer.disconnect()
    }
  }, [])

  return null
}
